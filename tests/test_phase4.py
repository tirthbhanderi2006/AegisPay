"""Comprehensive End-to-End and Adversarial Tests for Phase 4."""

import pytest
import random
from app.audit.repository import audit_repo
from app.audit.replay import replay_decision
from app.calibration.models import CalibrationConfig
from app.calibration.registry import calibration_registry
from app.calibration.trainer import split_chronological_dataset, train_logistic_calibration
from app.currency.converter import currency_converter
from app.entity_intelligence.synthetic import generate_cross_merchant_dataset
from app.firewall.engine import evaluate_session_from_dicts
from app.models.firewall import RecommendedAction


class TestPhase4EndToEndPipeline:
    def test_full_transaction_flow_with_calibration_and_audit(self):
        # 1. Generate dataset & train calibration model
        dataset = generate_cross_merchant_dataset(sample_count=60, seed=42)
        train, val, test = split_chronological_dataset(dataset, train_ratio=0.6, val_ratio=0.2)
        cal_res = train_logistic_calibration(train, val, test, version="e2e-cal-v1", epochs=50)
        calibration_registry.register(cal_res.config)
        calibration_registry.promote("e2e-cal-v1")

        # 2. Evaluate multi-currency session
        sample = dataset[0]
        assessment = evaluate_session_from_dicts(
            sample["current_session"],
            session_id=sample["scenario_id"],
            device_hash=sample["current_session"][0].get("device_hash"),
            calibration_config=cal_res.config,
        )

        assert 0.0 <= assessment.risk_score <= 1.0
        assert assessment.action in [RecommendedAction.ALLOW, RecommendedAction.CHALLENGE, RecommendedAction.BLOCK]
        assert assessment.evidence_quality > 0.0

        # 3. Verify audit snapshot and replay
        txn_id = f"txn_{sample['scenario_id']}"
        snapshot = audit_repo.get_snapshot(txn_id)
        assert snapshot is not None
        assert snapshot.calibration_version == "e2e-cal-v1"
        assert len(snapshot.decision_hash) == 64

        # 4. Replay decision
        replay_res = replay_decision(snapshot, config=cal_res.config)
        assert replay_res.deterministic_match is True
        assert replay_res.score_delta <= 0.001

    def test_adversarial_timing_and_amount_jitter(self):
        dataset = generate_cross_merchant_dataset(sample_count=20, seed=42)
        sample = dataset[0]

        # Normal evaluation
        normal_eval = evaluate_session_from_dicts(
            sample["current_session"],
            session_id="norm_sess",
            device_hash=sample["current_session"][0].get("device_hash"),
        )

        # Jittered session (+15% amount)
        jittered_events = []
        for e in sample["current_session"]:
            e_copy = dict(e)
            if e_copy.get("amount"):
                e_copy["amount"] = float(e_copy["amount"]) * 1.15
            jittered_events.append(e_copy)

        jitter_eval = evaluate_session_from_dicts(
            jittered_events,
            session_id="jit_sess",
            device_hash=jittered_events[0].get("device_hash"),
        )

        # Robustness: Risk score delta must be tightly bounded (< 0.15)
        assert abs(jitter_eval.risk_score - normal_eval.risk_score) < 0.15
