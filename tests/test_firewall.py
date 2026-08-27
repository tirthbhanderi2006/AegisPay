"""Comprehensive tests for the Phase 2 Behavioral Intent Firewall.

Tests cover:
  - Feature extraction (velocity, retry, variation, identity, session, historical)
  - Deterministic scoring (reproducibility, clamping)
  - Intent classification (all 6 classes)
  - Action policy (ALLOW, CHALLENGE, BLOCK thresholds)
  - Edge cases (insufficient data, shared device, shared IP, legit retries)
  - Engine integration
  - Latency
  - API validation
"""

import time
from typing import Any, Dict, List

import pytest

from app.firewall.features import extract_lifecycle_aware, extract_session_only
from app.firewall.scoring import compute_risk_score
from app.firewall.intent import classify_intent
from app.firewall.policy import decide_action, POLICY_VERSION
from app.firewall.engine import evaluate_session, evaluate_session_from_dicts
from app.models.firewall import (
    BehavioralFeatures,
    FirewallAssessment,
    IntentClass,
    RecommendedAction,
    SessionEvaluationRequest,
    SessionEvent,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_events(specs: List[Dict[str, Any]], base_ts: str = "2026-07-20T10:00:00+00:00") -> List[Dict[str, Any]]:
    """Build a list of event dicts from compact specs."""
    from datetime import datetime, timedelta, timezone
    base = datetime.fromisoformat(base_ts)
    events = []
    for i, s in enumerate(specs):
        t = base + timedelta(seconds=s.get("offset_s", i * 10))
        ev = {
            "event_id": s.get("event_id", f"e_{i:04d}"),
            "event_type": s["type"],
            "timestamp": t.isoformat(),
            "device_hash": s.get("device", "dev_test"),
            "ip_address": s.get("ip", "10.0.0.1"),
            "account_id": s.get("account", "acc_test"),
        }
        if "amount" in s:
            ev["amount"] = s["amount"]
        if "token" in s:
            ev["payment_instrument_token"] = s["token"]
        events.append(ev)
    return events


# ===========================================================================
# FEATURE EXTRACTION
# ===========================================================================

class TestVelocityFeatures:
    def test_counts_attempts_in_window(self):
        events = _make_events([
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 0},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 10},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 30},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 55},  # within 1m of last
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 250},  # within 5m of last
        ])
        f = extract_session_only(events)
        # All 5 within 5 minutes of the last event
        assert f.payment_attempts_last_5m == 5
        # Count attempts within 60s of the last event (t=250)
        assert f.payment_attempts_last_1m >= 1

    def test_failure_counts(self):
        events = _make_events([
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 0},
            {"type": "PAYMENT_FAILED", "offset_s": 5},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 10},
            {"type": "PAYMENT_FAILED", "offset_s": 15},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 20},
            {"type": "PAYMENT_SUCCEEDED", "offset_s": 25},
        ])
        f = extract_session_only(events)
        assert f.payment_failures_last_1m == 2
        assert f.payment_failures_last_5m == 2


class TestRetryFeatures:
    def test_retry_count_and_intervals(self):
        events = _make_events([
            {"type": "PAYMENT_RETRIED", "offset_s": 0},
            {"type": "PAYMENT_RETRIED", "offset_s": 3},
            {"type": "PAYMENT_RETRIED", "offset_s": 6},
            {"type": "PAYMENT_RETRIED", "offset_s": 60},
        ])
        f = extract_session_only(events)
        assert f.retry_count == 4
        assert f.min_retry_interval_s == 3.0
        # 2 of 3 intervals < 5s
        assert f.rapid_retry_ratio > 0.5

    def test_no_retries_zeroes(self):
        events = _make_events([{"type": "PAYMENT_ATTEMPTED", "offset_s": 0}])
        f = extract_session_only(events)
        assert f.retry_count == 0
        assert f.avg_retry_interval_s == 0


class TestPaymentVariation:
    def test_unique_instruments(self):
        events = _make_events([
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 0, "token": "tok_a"},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 10, "token": "tok_b"},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 20, "token": "tok_c"},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 30, "token": "tok_a"},  # dup
        ])
        f = extract_session_only(events)
        assert f.unique_instrument_count == 3

    def test_amount_variance(self):
        events = _make_events([
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 0, "amount": 10.0},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 10, "amount": 100.0},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 20, "amount": 50.0},
        ])
        f = extract_session_only(events)
        assert f.amount_variance > 0


class TestIdentityFeatures:
    def test_device_change_count(self):
        events = _make_events([
            {"type": "SESSION_STARTED", "offset_s": 0, "device": "dev_a"},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 10, "device": "dev_b"},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 20, "device": "dev_c"},
        ])
        f = extract_session_only(events)
        assert f.device_change_count == 2

    def test_ip_change_count(self):
        events = _make_events([
            {"type": "SESSION_STARTED", "offset_s": 0, "ip": "10.0.0.1"},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 10, "ip": "10.0.0.2"},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 20, "ip": "10.0.0.3"},
        ])
        f = extract_session_only(events)
        assert f.ip_change_count == 2


class TestSessionBehavior:
    def test_session_duration(self):
        events = _make_events([
            {"type": "SESSION_STARTED", "offset_s": 0},
            {"type": "SESSION_ENDED", "offset_s": 120},
        ])
        f = extract_session_only(events)
        assert f.session_duration_s == 120.0

    def test_checkout_to_payment(self):
        events = _make_events([
            {"type": "CHECKOUT_VIEWED", "offset_s": 0},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 45},
        ])
        f = extract_session_only(events)
        assert f.checkout_to_payment_s == 45.0

    def test_failed_to_success_ratio(self):
        events = _make_events([
            {"type": "PAYMENT_FAILED", "offset_s": 0},
            {"type": "PAYMENT_FAILED", "offset_s": 10},
            {"type": "PAYMENT_SUCCEEDED", "offset_s": 20},
        ])
        f = extract_session_only(events)
        assert f.failed_to_success_ratio == 2.0


class TestHistoricalFeatures:
    def test_lifecycle_aware_enriches_history(self):
        events = _make_events([
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 0, "account": "acc_1", "device": "dev_1"},
        ])
        history = [
            {"event_type": "PAYMENT_ATTEMPTED", "timestamp": "2026-06-01T10:00:00+00:00",
             "transaction_id": "txn_h1", "device_hash": "dev_1", "ip_address": "10.0.0.1",
             "account_id": "acc_1"},
            {"event_type": "PAYMENT_SUCCEEDED", "timestamp": "2026-06-01T10:01:00+00:00",
             "transaction_id": "txn_h1", "device_hash": "dev_1", "ip_address": "10.0.0.1",
             "account_id": "acc_1"},
            {"event_type": "PAYMENT_ATTEMPTED", "timestamp": "2026-06-15T10:00:00+00:00",
             "transaction_id": "txn_h2", "device_hash": "dev_1", "ip_address": "10.0.0.2",
             "account_id": "acc_1"},
            {"event_type": "PAYMENT_FAILED", "timestamp": "2026-06-15T10:01:00+00:00",
             "transaction_id": "txn_h2", "device_hash": "dev_1", "ip_address": "10.0.0.2",
             "account_id": "acc_1"},
        ]
        f = extract_lifecycle_aware(events, history)
        assert f.historical_txn_count == 2
        assert f.historical_failure_rate > 0
        assert f.historical_ip_count >= 2


# ===========================================================================
# SCORING
# ===========================================================================

class TestScoring:
    def test_same_input_same_score(self):
        f = BehavioralFeatures(
            payment_attempts_last_1m=8,
            payment_failures_last_1m=7,
            retry_count=5,
            rapid_retry_ratio=0.8,
            unique_instrument_count=5,
        )
        s1, _, c1 = compute_risk_score(f)
        s2, _, c2 = compute_risk_score(f)
        assert s1 == s2, "Scoring must be deterministic"
        assert c1 == c2, "Feature contributions must be deterministic"

    def test_score_clamped_zero_one(self):
        # Very suspicious
        f_bad = BehavioralFeatures(
            payment_attempts_last_1m=50,
            payment_failures_last_1m=49,
            retry_count=20,
            rapid_retry_ratio=1.0,
            unique_instrument_count=15,
            device_change_count=10,
            ip_change_count=10,
        )
        score_bad, _, _ = compute_risk_score(f_bad)
        assert 0.0 <= score_bad <= 1.0

        # Very normal
        f_good = BehavioralFeatures()
        score_good, _, _ = compute_risk_score(f_good)
        assert 0.0 <= score_good <= 1.0

    def test_suspicious_features_score_higher(self):
        f_normal = BehavioralFeatures(payment_attempts_last_1m=1)
        f_suspicious = BehavioralFeatures(
            payment_attempts_last_1m=10,
            payment_failures_last_1m=9,
            retry_count=5,
            unique_instrument_count=5,
        )
        s_normal, _, _ = compute_risk_score(f_normal)
        s_suspicious, _, _ = compute_risk_score(f_suspicious)
        assert s_suspicious > s_normal



# ===========================================================================
# INTENT CLASSIFICATION
# ===========================================================================

class TestIntentClassification:
    def test_card_testing_detected(self):
        f = BehavioralFeatures(
            payment_attempts_last_5m=10,
            payment_failures_last_5m=8,
            retry_count=4,
            avg_retry_interval_s=3,
            unique_instrument_count=6,
            failed_to_success_ratio=8.0,
        )
        intent, reasons = classify_intent(f)
        assert intent == IntentClass.CARD_TESTING

    def test_automated_checkout_detected(self):
        f = BehavioralFeatures(
            event_interval_stddev=0.1,
            events_per_second=2.0,
            checkout_to_payment_s=1.0,
            payment_attempts_last_5m=5,
            session_duration_s=10,
        )
        intent, _ = classify_intent(f)
        assert intent == IntentClass.AUTOMATED_CHECKOUT

    def test_account_takeover_detected(self):
        f = BehavioralFeatures(
            device_change_count=3,
            ip_change_count=3,
            devices_on_account=4,
            payment_attempts_last_5m=5,
        )
        intent, _ = classify_intent(f)
        assert intent == IntentClass.ACCOUNT_TAKEOVER_LIKE

    def test_suspicious_velocity_detected(self):
        f = BehavioralFeatures(
            payment_attempts_last_1m=6,
            session_duration_s=60,
        )
        intent, _ = classify_intent(f)
        assert intent == IntentClass.SUSPICIOUS_VELOCITY

    def test_normal_behavior(self):
        f = BehavioralFeatures(
            payment_attempts_last_1m=1,
            payment_attempts_last_5m=2,
            session_duration_s=120,
        )
        intent, _ = classify_intent(f)
        assert intent == IntentClass.NORMAL

    def test_unknown_insufficient_data(self):
        f = BehavioralFeatures()  # all defaults, no events
        intent, _ = classify_intent(f)
        assert intent == IntentClass.UNKNOWN


# ===========================================================================
# ACTION POLICY
# ===========================================================================

class TestActionPolicy:
    def test_allow_low_risk(self):
        action = decide_action(0.1, IntentClass.NORMAL)
        assert action == RecommendedAction.ALLOW

    def test_challenge_medium_risk(self):
        action = decide_action(0.5, IntentClass.SUSPICIOUS_VELOCITY)
        assert action == RecommendedAction.CHALLENGE

    def test_block_high_risk(self):
        action = decide_action(0.85, IntentClass.CARD_TESTING)
        assert action == RecommendedAction.BLOCK

    def test_unknown_always_allow(self):
        action = decide_action(0.9, IntentClass.UNKNOWN)
        assert action == RecommendedAction.ALLOW


# ===========================================================================
# EDGE CASES — FALSE POSITIVE PROTECTION
# ===========================================================================

class TestLegitimateSharedDevice:
    def test_family_device_not_blocked(self):
        """Family members sharing a device should not trigger BLOCK."""
        from app.synthetic.generator import gen_legitimate_shared_device
        import random
        events, label, expected, history = gen_legitimate_shared_device(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="fam_test")
        assert assessment.action != RecommendedAction.BLOCK


class TestLegitimateSharedIP:
    def test_office_ip_not_blocked(self):
        """Office users sharing an IP should not trigger BLOCK."""
        from app.synthetic.generator import gen_legitimate_shared_ip
        import random
        events, label, expected, history = gen_legitimate_shared_ip(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="office_test")
        assert assessment.action != RecommendedAction.BLOCK


class TestLegitimateRetry:
    def test_network_retries_not_blocked(self):
        """Legitimate retries due to network issues should not BLOCK."""
        from app.synthetic.generator import gen_legitimate_retry
        import random
        events, label, expected, history = gen_legitimate_retry(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="retry_test", historical_events=history)
        assert assessment.action != RecommendedAction.BLOCK


# ===========================================================================
# ATTACK DETECTION
# ===========================================================================

class TestCardTestingDetection:
    def test_rapid_card_testing_blocked(self):
        from app.synthetic.generator import gen_card_testing_a
        import random
        events, label, expected, history = gen_card_testing_a(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="ct_a_test")
        assert assessment.intent in (IntentClass.CARD_TESTING, IntentClass.SUSPICIOUS_VELOCITY)
        assert assessment.action in (RecommendedAction.BLOCK, RecommendedAction.CHALLENGE)

    def test_slow_card_testing_detected(self):
        from app.synthetic.generator import gen_card_testing_b
        import random
        events, label, expected, history = gen_card_testing_b(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="ct_b_test")
        assert assessment.intent != IntentClass.NORMAL


class TestAccountTakeoverDetection:
    def test_ato_detected(self):
        from app.synthetic.generator import gen_account_takeover
        import random
        events, label, expected, history = gen_account_takeover(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="ato_test", historical_events=history)
        assert assessment.intent != IntentClass.NORMAL
        assert assessment.action in (RecommendedAction.BLOCK, RecommendedAction.CHALLENGE)


class TestAutomatedCheckoutDetection:
    def test_bot_checkout_detected(self):
        from app.synthetic.generator import gen_automated_checkout
        import random
        events, label, expected, history = gen_automated_checkout(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="bot_test")
        assert assessment.intent != IntentClass.NORMAL


class TestDistributedSuspicious:
    def test_coordinated_attack_detected(self):
        from app.synthetic.generator import gen_distributed_suspicious
        import random
        events, label, expected, history = gen_distributed_suspicious(random.Random(42), 0)
        assessment = evaluate_session_from_dicts(events, session_id="dist_test")
        assert assessment.intent != IntentClass.NORMAL


# ===========================================================================
# ENGINE INTEGRATION
# ===========================================================================

class TestEngineIntegration:
    def test_full_evaluation_returns_assessment(self):
        request = SessionEvaluationRequest(
            merchant_id="merch_001",
            session_id="sess_001",
            events=[
                SessionEvent(event_id="e1", event_type="SESSION_STARTED",
                             timestamp="2026-07-20T10:00:00+00:00"),
                SessionEvent(event_id="e2", event_type="PAYMENT_ATTEMPTED",
                             timestamp="2026-07-20T10:01:00+00:00",
                             amount=49.99, payment_instrument_token="tok_1"),
                SessionEvent(event_id="e3", event_type="PAYMENT_SUCCEEDED",
                             timestamp="2026-07-20T10:01:05+00:00",
                             amount=49.99),
            ],
            device_hash="dev_001",
            ip_address="10.0.0.1",
            account_id="acc_001",
        )
        assessment = evaluate_session(request)
        assert isinstance(assessment, FirewallAssessment)
        assert assessment.session_id == "sess_001"
        assert 0.0 <= assessment.risk_score <= 1.0
        assert assessment.policy_version == POLICY_VERSION
        assert assessment.latency_ms > 0

    def test_missing_data_reported(self):
        request = SessionEvaluationRequest(
            merchant_id="merch_001",
            session_id="sess_002",
            events=[
                SessionEvent(event_id="e1", event_type="SESSION_STARTED",
                             timestamp="2026-07-20T10:00:00+00:00"),
            ],
            # No device_hash, ip_address, or account_id
        )
        assessment = evaluate_session(request)
        assert "device_hash" in assessment.missing_data
        assert "ip_address" in assessment.missing_data
        assert "account_id" in assessment.missing_data


# ===========================================================================
# LATENCY
# ===========================================================================

class TestLatency:
    def test_single_evaluation_under_50ms(self):
        """Firewall evaluation should complete in under 50ms for a typical session."""
        events = _make_events([
            {"type": "SESSION_STARTED", "offset_s": 0},
            {"type": "CHECKOUT_VIEWED", "offset_s": 30},
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 90, "amount": 50, "token": "tok"},
            {"type": "PAYMENT_SUCCEEDED", "offset_s": 95, "amount": 50},
            {"type": "SESSION_ENDED", "offset_s": 120},
        ])
        start = time.perf_counter()
        assessment = evaluate_session_from_dicts(events, session_id="perf_test")
        elapsed_ms = (time.perf_counter() - start) * 1000
        assert elapsed_ms < 50, f"Evaluation took {elapsed_ms:.2f}ms, expected <50ms"


# ===========================================================================
# API VALIDATION
# ===========================================================================

class TestAPIModels:
    def test_session_evaluation_request_rejects_extra(self):
        with pytest.raises(Exception):
            SessionEvaluationRequest(
                merchant_id="m1", session_id="s1", events=[],
                unknown_field="bad",
            )

    def test_session_event_allows_extra(self):
        ev = SessionEvent(
            event_id="e1", event_type="TEST", timestamp="2026-01-01T00:00:00Z",
            extra_field="ok",
        )
        assert ev.event_id == "e1"


# ===========================================================================
# PHASE 2.1 — LONGITUDINAL DETECTION & FEATURE CONTRIBUTIONS
# ===========================================================================

class TestTrueLongitudinalScenarios:
    def test_longitudinal_device_cycling_detected_by_lifecycle_only(self):
        """Current session looks normal, but device history reveals 5 accounts with failures."""
        from app.synthetic.generator import gen_longitudinal_device_cycling
        import random
        events, label, exp_action, history = gen_longitudinal_device_cycling(random.Random(42), 0)

        # Session-only: sees 1 normal attempt -> low risk, ALLOW
        sess_assessment = evaluate_session_from_dicts(events, session_id="test_ldc_sess")
        assert sess_assessment.risk_score < 0.30
        assert sess_assessment.action == RecommendedAction.ALLOW

        # Lifecycle-aware: detects multi-account device farm -> high risk, BLOCK/CHALLENGE
        life_assessment = evaluate_session_from_dicts(events, session_id="test_ldc_life", historical_events=history)
        assert life_assessment.risk_score > sess_assessment.risk_score
        assert life_assessment.risk_score >= 0.50
        assert life_assessment.action in (RecommendedAction.BLOCK, RecommendedAction.CHALLENGE)

    def test_longitudinal_low_and_slow_detected(self):
        """Current session has 1 attempt, but history reveals 12 probing sessions with failures."""
        from app.synthetic.generator import gen_longitudinal_low_and_slow
        import random
        events, label, exp_action, history = gen_longitudinal_low_and_slow(random.Random(42), 0)

        sess_assessment = evaluate_session_from_dicts(events, session_id="test_lls_sess")
        life_assessment = evaluate_session_from_dicts(events, session_id="test_lls_life", historical_events=history)

        assert life_assessment.risk_score > sess_assessment.risk_score
        assert life_assessment.risk_score >= 0.35
        assert life_assessment.action in (RecommendedAction.CHALLENGE, RecommendedAction.BLOCK)
        assert life_assessment.intent == IntentClass.CARD_TESTING

    def test_longitudinal_device_rotation_detected(self):
        """Account rotates through 5 devices in 48 hours."""
        from app.synthetic.generator import gen_longitudinal_device_rotation
        import random
        events, label, exp_action, history = gen_longitudinal_device_rotation(random.Random(42), 0)

        sess_assessment = evaluate_session_from_dicts(events, session_id="test_ldr_sess")
        life_assessment = evaluate_session_from_dicts(events, session_id="test_ldr_life", historical_events=history)

        assert life_assessment.risk_score > sess_assessment.risk_score
        assert life_assessment.intent == IntentClass.ACCOUNT_TAKEOVER_LIKE

    def test_longitudinal_failure_pattern_detected(self):
        """Current session is 1 attempt, but account has 90% failure history."""
        from app.synthetic.generator import gen_longitudinal_failure_pattern
        import random
        events, label, exp_action, history = gen_longitudinal_failure_pattern(random.Random(42), 0)

        sess_assessment = evaluate_session_from_dicts(events, session_id="test_lfp_sess")
        life_assessment = evaluate_session_from_dicts(events, session_id="test_lfp_life", historical_events=history)

        assert life_assessment.risk_score > sess_assessment.risk_score
        assert life_assessment.risk_score >= 0.35
        assert life_assessment.action in (RecommendedAction.CHALLENGE, RecommendedAction.BLOCK)
        assert life_assessment.intent == IntentClass.CARD_TESTING



class TestFeatureContributionsAndEvidenceQuality:
    def test_feature_contributions_exposed_deterministically(self):
        events = _make_events([
            {"type": "PAYMENT_ATTEMPTED", "offset_s": 0},
            {"type": "PAYMENT_FAILED", "offset_s": 5},
            {"type": "PAYMENT_RETRIED", "offset_s": 10},
            {"type": "PAYMENT_FAILED", "offset_s": 15},
        ])
        assessment = evaluate_session_from_dicts(events, session_id="contrib_test")
        assert "velocity" in assessment.feature_contributions
        assert "retry" in assessment.feature_contributions
        assert len(assessment.signals) > 0
        for s in assessment.signals:
            assert hasattr(s, "contribution")
            assert s.contribution >= 0.0

    def test_evidence_quality_reflects_telemetry_depth(self):
        # Sparse session without identifiers or history
        sparse_events = [{"event_id": "e1", "event_type": "PAYMENT_ATTEMPTED", "timestamp": "2026-07-20T10:00:00Z"}]
        sparse_assessment = evaluate_session_from_dicts(sparse_events, session_id="sparse")
        assert sparse_assessment.evidence_quality < 0.50

        # Rich session with device, ip, account, and historical context
        history = [{"event_type": "PAYMENT_SUCCEEDED", "timestamp": "2026-06-01T10:00:00Z", "transaction_id": "tx1"}]
        rich_events = [
            {"event_id": "e1", "event_type": "CHECKOUT_VIEWED", "timestamp": "2026-07-20T10:00:00Z", "device_hash": "d1", "ip_address": "1.1.1.1", "account_id": "a1"},
            {"event_id": "e2", "event_type": "PAYMENT_ATTEMPTED", "timestamp": "2026-07-20T10:01:00Z", "device_hash": "d1", "ip_address": "1.1.1.1", "account_id": "a1"},
        ]
        rich_assessment = evaluate_session_from_dicts(rich_events, session_id="rich", historical_events=history, device_hash="d1", ip_address="1.1.1.1", account_id="a1")
        assert rich_assessment.evidence_quality >= 0.80


class TestAdversarialRobustness:
    def test_timing_jitter_stability(self):
        """Jittering timestamps by ±10% should not wildly shift intent or risk score."""
        from app.synthetic.generator import gen_card_testing_a
        import random
        events1, _, _, _ = gen_card_testing_a(random.Random(42), 0)
        events2, _, _, _ = gen_card_testing_a(random.Random(43), 0)

        a1 = evaluate_session_from_dicts(events1, session_id="r1")
        a2 = evaluate_session_from_dicts(events2, session_id="r2")

        assert a1.intent == a2.intent == IntentClass.CARD_TESTING
        assert abs(a1.risk_score - a2.risk_score) < 0.15

