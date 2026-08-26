"""Phase 1 lifecycle tests — all hermetic (no DB, no LLM).

Tests cover:
  - Event ingestion model validation
  - Duplicate event_id detection
  - Out-of-order event reconstruction
  - Missing events detection
  - Contradictory events detection
  - Transaction reconstruction completeness
  - Evidence completeness scoring
  - Dispute with stored lifecycle history (enrichment injected)
  - Dispute without stored lifecycle history (existing behavior preserved)
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.engine.reconstruction import reconstruct_from_events
from app.models.lifecycle import (
    LIFECYCLE_ORDER,
    EventType,
    PaymentEvent,
    PaymentEventEnvelope,
    EvidenceRecord,
    TransactionReconstruction,
    _compute_integrity_hash,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "data" / "fixtures"


def _load_lifecycle_fixture(name: str) -> dict:
    with open(FIXTURES / name, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 1. Event ingestion — valid event model
# ---------------------------------------------------------------------------

class TestEventIngestion:
    def test_valid_event_creates_integrity_hash(self):
        event = PaymentEvent(
            event_id="evt_001",
            transaction_id="txn_001",
            merchant_id="merch_001",
            event_type=EventType.CHECKOUT_STARTED,
            timestamp="2026-07-15T10:00:00Z",
            source="test",
        )
        assert event.integrity_hash != ""
        expected_hash = _compute_integrity_hash(
            "evt_001", "txn_001", "CHECKOUT_STARTED", "2026-07-15T10:00:00Z"
        )
        assert event.integrity_hash == expected_hash

    def test_envelope_validates_event_type(self):
        envelope = PaymentEventEnvelope(
            event_id="evt_002",
            transaction_id="txn_002",
            merchant_id="merch_001",
            event_type="PAYMENT_CAPTURED",
            timestamp="2026-07-15T10:02:00Z",
        )
        assert envelope.event_type == EventType.PAYMENT_CAPTURED

    def test_envelope_rejects_invalid_event_type(self):
        with pytest.raises(Exception):
            PaymentEventEnvelope(
                event_id="evt_003",
                transaction_id="txn_003",
                merchant_id="merch_001",
                event_type="INVALID_TYPE",
                timestamp="2026-07-15T10:00:00Z",
            )

    def test_evidence_record_auto_hash(self):
        rec = EvidenceRecord(
            evidence_id="evd_001",
            transaction_id="txn_001",
            merchant_id="merch_001",
            evidence_type="CHECKOUT_STARTED",
            timestamp="2026-07-15T10:00:00Z",
        )
        assert rec.integrity_hash != ""


# ---------------------------------------------------------------------------
# 2. Duplicate event_id detection
# ---------------------------------------------------------------------------

class TestDuplicateDetection:
    def test_duplicate_events_detected_in_reconstruction(self):
        events = [
            {"event_id": "e1", "event_type": "CHECKOUT_STARTED", "timestamp": "2026-07-15T10:00:00Z", "source": "s"},
            {"event_id": "e2", "event_type": "CHECKOUT_STARTED", "timestamp": "2026-07-15T10:01:00Z", "source": "s"},
            {"event_id": "e3", "event_type": "PAYMENT_CAPTURED", "timestamp": "2026-07-15T10:02:00Z", "source": "s"},
        ]
        result = reconstruct_from_events("txn_dup", events)
        assert len(result.duplicate_events) == 1
        assert "CHECKOUT_STARTED" in result.duplicate_events[0]


# ---------------------------------------------------------------------------
# 3. Out-of-order events — timeline reconstructed in correct order
# ---------------------------------------------------------------------------

class TestOutOfOrderEvents:
    def test_events_sorted_by_timestamp(self):
        events = [
            {"event_id": "e3", "event_type": "PAYMENT_CAPTURED", "timestamp": "2026-07-15T10:02:00Z", "source": "s"},
            {"event_id": "e1", "event_type": "CHECKOUT_STARTED", "timestamp": "2026-07-15T10:00:00Z", "source": "s"},
            {"event_id": "e2", "event_type": "AUTHENTICATION_COMPLETED", "timestamp": "2026-07-15T10:01:00Z", "source": "s"},
        ]
        result = reconstruct_from_events("txn_order", events)
        types_in_order = [e.event_type for e in result.timeline]
        assert types_in_order == ["CHECKOUT_STARTED", "AUTHENTICATION_COMPLETED", "PAYMENT_CAPTURED"]


# ---------------------------------------------------------------------------
# 4. Missing events
# ---------------------------------------------------------------------------

class TestMissingEvents:
    def test_missing_events_identified(self):
        events = [
            {"event_id": "e1", "event_type": "CHECKOUT_STARTED", "timestamp": "2026-07-15T10:00:00Z", "source": "s"},
            {"event_id": "e2", "event_type": "PAYMENT_CAPTURED", "timestamp": "2026-07-15T10:02:00Z", "source": "s"},
        ]
        result = reconstruct_from_events("txn_missing", events)
        assert "AUTHENTICATION_COMPLETED" in result.evidence_missing
        assert "PAYMENT_AUTHORIZED" in result.evidence_missing
        assert "ORDER_CONFIRMED" in result.evidence_missing
        assert "FULFILLMENT_STARTED" in result.evidence_missing
        assert "DELIVERED" in result.evidence_missing
        assert "CHECKOUT_STARTED" not in result.evidence_missing
        assert "PAYMENT_CAPTURED" not in result.evidence_missing


# ---------------------------------------------------------------------------
# 5. Contradictory events
# ---------------------------------------------------------------------------

class TestContradictoryEvents:
    def test_delivered_before_fulfillment_detected(self):
        events = [
            {"event_id": "e1", "event_type": "CHECKOUT_STARTED", "timestamp": "2026-07-15T10:00:00Z", "source": "s"},
            {"event_id": "e2", "event_type": "DELIVERED", "timestamp": "2026-07-16T08:00:00Z", "source": "s"},
            {"event_id": "e3", "event_type": "FULFILLMENT_STARTED", "timestamp": "2026-07-17T09:00:00Z", "source": "s"},
        ]
        result = reconstruct_from_events("txn_contra", events)
        assert len(result.contradictory_events) >= 1
        assert any("DELIVERED" in c and "FULFILLMENT_STARTED" in c for c in result.contradictory_events)


# ---------------------------------------------------------------------------
# 6. Transaction reconstruction from fixture
# ---------------------------------------------------------------------------

class TestTransactionReconstruction:
    def test_normal_transaction_complete_lifecycle(self):
        fixture = _load_lifecycle_fixture("normal_transaction.json")
        events = fixture["events"]
        result = reconstruct_from_events("txn_lifecycle_normal_001", events)
        assert result.transaction_id == "txn_lifecycle_normal_001"
        assert len(result.timeline) == 7
        assert result.evidence_missing == []
        assert result.contradictory_events == []
        assert result.duplicate_events == []

    def test_disputed_transaction_has_dispute_event(self):
        fixture = _load_lifecycle_fixture("disputed_transaction.json")
        events = fixture["events"]
        result = reconstruct_from_events("txn_lifecycle_disputed_001", events)
        assert len(result.timeline) == 8
        event_types = [e.event_type for e in result.timeline]
        assert "DISPUTE_OPENED" in event_types


# ---------------------------------------------------------------------------
# 7. Evidence completeness scoring
# ---------------------------------------------------------------------------

class TestCompletenessScoring:
    def test_perfect_lifecycle_scores_one(self):
        fixture = _load_lifecycle_fixture("normal_transaction.json")
        events = fixture["events"]
        result = reconstruct_from_events("txn_lifecycle_normal_001", events)
        assert result.completeness_score == 1.0

    def test_partial_lifecycle_scores_fractional(self):
        events = [
            {"event_id": "e1", "event_type": "CHECKOUT_STARTED", "timestamp": "2026-07-15T10:00:00Z", "source": "s"},
            {"event_id": "e2", "event_type": "PAYMENT_CAPTURED", "timestamp": "2026-07-15T10:02:00Z", "source": "s"},
            {"event_id": "e3", "event_type": "DELIVERED", "timestamp": "2026-07-19T14:00:00Z", "source": "s"},
        ]
        result = reconstruct_from_events("txn_partial", events)
        # 3 of 7 expected = ~0.4286
        assert 0.42 <= result.completeness_score <= 0.43

    def test_empty_events_scores_zero(self):
        result = reconstruct_from_events("txn_empty", [])
        assert result.completeness_score == 0.0
        assert len(result.evidence_missing) == 7


# ---------------------------------------------------------------------------
# 8. Dispute with stored lifecycle history — enrichment injected
# ---------------------------------------------------------------------------

class TestDisputeWithLifecycleHistory:
    def test_enrich_from_lifecycle_injects_data_when_available(self):
        from app.graph import workflow as wf

        fixture = _load_lifecycle_fixture("normal_transaction.json")
        raw_events = fixture["events"]

        # Mock reconstruction to return lifecycle data for the disputed txn
        mock_reconstruction = reconstruct_from_events("txn_20260601_8842", raw_events)

        with patch("app.engine.reconstruction.reconstruct_transaction", return_value=mock_reconstruction):
            from app.models.dispute import DisputeEvent
            from tests.conftest import load_fixture

            strong = DisputeEvent.model_validate(load_fixture("visa_ce3_qualified.json"))
            result = wf.enrich_from_lifecycle_node(wf.build_initial_state(strong))

        assert "transaction_timeline" in result
        assert len(result["transaction_timeline"]) == 7
        assert result["evidence_completeness"] == 1.0
        assert result["evidence_missing"] == []


# ---------------------------------------------------------------------------
# 9. Dispute without stored lifecycle history — existing behavior preserved
# ---------------------------------------------------------------------------

class TestDisputeWithoutLifecycleHistory:
    def test_enrich_returns_empty_when_no_lifecycle_data(self):
        from app.graph import workflow as wf

        with patch("app.engine.reconstruction.reconstruct_transaction", return_value=None):
            from app.models.dispute import DisputeEvent
            from tests.conftest import load_fixture

            strong = DisputeEvent.model_validate(load_fixture("visa_ce3_qualified.json"))
            result = wf.enrich_from_lifecycle_node(wf.build_initial_state(strong))

        assert result == {}

    def test_full_pipeline_without_lifecycle_still_works(self, strong_event, monkeypatch):
        """Existing pipeline behavior preserved when lifecycle store is empty."""
        from app.graph import workflow as wf

        def _fake_draft(state):
            return {
                "dossier": {
                    "executive_summary": "Test.",
                    "dispute_classification": "Test",
                    "compelling_evidence_type": "Test",
                    "evidence_points": [],
                    "rebuttal_narrative": "x" * 250,
                },
                "draft_llm_failed": False,
            }

        def _fake_audit_pass(state):
            iterations = state.get("iterations", 0) + 1
            record = {
                "passed": True, "confidence_score": 0.9,
                "deficiencies": [], "suggested_revisions": [],
                "iteration": iterations, "auditor_llm_failed": False,
            }
            return {
                "audit": record,
                "audit_history": list(state.get("audit_history", [])) + [record],
                "iterations": iterations,
            }

        monkeypatch.setattr(wf, "run_draft", _fake_draft)
        monkeypatch.setattr(wf, "run_audit", _fake_audit_pass)

        # Patch reconstruction to return None (no lifecycle data)
        with patch("app.engine.reconstruction.reconstruct_transaction", return_value=None):
            final_state = wf.workflow.invoke(wf.build_initial_state(strong_event))

        assert final_state["decision"] == "fight"
        assert final_state["final_status"] == wf.FINAL_FOUGHT
        # Lifecycle fields should still be None (no enrichment)
        assert final_state.get("transaction_timeline") is None
