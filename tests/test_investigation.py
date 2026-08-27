"""Tests for transaction investigation, timeline, and privacy-safe entity masking."""

from fastapi.testclient import TestClient
from app.main import app
from app.audit.models import RiskDecisionSnapshot
from app.audit.repository import audit_repo
from app.events.models import IntegrationEventPayload, IntegrationEventType
from app.events.repository import integration_event_repo
from app.models.firewall import RecommendedAction


def make_dummy_snapshot(
    transaction_id: str,
    merchant_id: str = "m_alpha",
    final_score: float = 0.5,
    final_action: RecommendedAction = RecommendedAction.CHALLENGE,
) -> RiskDecisionSnapshot:
    return RiskDecisionSnapshot(
        transaction_id=transaction_id,
        session_id=f"sess_{transaction_id}",
        merchant_id=merchant_id,
        timestamp="2026-08-27T10:00:00Z",
        feature_values={"velocity_score": 0.1},
        feature_contributions={"velocity": 0.1},
        calibration_version="cal-v1",
        calibration_hash="hash-123",
        threshold_version="thresh-v1",
        fx_rate_version="identity",
        evidence_quality=0.85,
        final_score=final_score,
        final_action=final_action,
    )


class TestInvestigationEndpoints:
    """Test suite for investigation and timeline APIs."""

    def setup_method(self) -> None:
        self.client = TestClient(app)
        self.headers = {"X-API-Key": "ak_test_alpha_456"}

    def test_get_transaction_details(self) -> None:
        snap = make_dummy_snapshot("txn_inv_100", merchant_id="m_alpha", final_score=0.42, final_action=RecommendedAction.CHALLENGE)
        audit_repo.save_snapshot(snap)

        resp = self.client.get("/v1/risk/transactions/txn_inv_100", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["transaction_id"] == "txn_inv_100"
        assert data["merchant_id"] == "m_alpha"
        assert data["decision"] == "CHALLENGE"
        assert data["risk_score"] == 0.42

    def test_get_transaction_entities_privacy_masked(self) -> None:
        snap = make_dummy_snapshot("txn_inv_entities", merchant_id="m_alpha", final_score=0.20, final_action=RecommendedAction.ALLOW)
        audit_repo.save_snapshot(snap)

        ev = IntegrationEventPayload(
            event_id="evt_ent_1",
            event_type=IntegrationEventType.TRANSACTION_CREATED,
            transaction_id="txn_inv_entities",
            merchant_id="m_alpha",
            device_token="device_fingerprint_secure_hash_8899",
            ip_token="192_168_1_50_ip_hash",
        )
        integration_event_repo.save(ev)

        resp = self.client.get("/v1/risk/transactions/txn_inv_entities/entities", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "privacy_notice" in data
        assert data["entities"]["device_token"].startswith("dev_***")
        assert data["entities"]["ip_token"].startswith("ip_***")

    def test_get_transaction_timeline(self) -> None:
        snap = make_dummy_snapshot("txn_inv_timeline", merchant_id="m_alpha", final_score=0.10, final_action=RecommendedAction.ALLOW)
        audit_repo.save_snapshot(snap)

        ev = IntegrationEventPayload(
            event_id="evt_time_1",
            event_type=IntegrationEventType.TRANSACTION_CREATED,
            transaction_id="txn_inv_timeline",
            merchant_id="m_alpha",
            timestamp="2026-08-27T10:05:00Z",
        )
        integration_event_repo.save(ev)

        resp = self.client.get("/v1/risk/transactions/txn_inv_timeline/timeline", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_events"] >= 1
        assert data["timeline_events"][0]["event_id"] == "evt_time_1"
