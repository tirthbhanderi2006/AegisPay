"""Tests for strict API security, multi-tenant isolation, and PAN/CVV rejection."""

from fastapi.testclient import TestClient
from app.main import app
from app.audit.models import RiskDecisionSnapshot
from app.audit.repository import audit_repo
from app.models.firewall import RecommendedAction


def make_dummy_snapshot(
    transaction_id: str,
    merchant_id: str = "m_beta",
    final_score: float = 0.85,
    final_action: RecommendedAction = RecommendedAction.BLOCK,
) -> RiskDecisionSnapshot:
    return RiskDecisionSnapshot(
        transaction_id=transaction_id,
        session_id=f"sess_{transaction_id}",
        merchant_id=merchant_id,
        timestamp="2026-08-27T10:00:00Z",
        feature_values={"velocity_score": 0.8},
        feature_contributions={"velocity": 0.8},
        calibration_version="cal-v1",
        calibration_hash="hash-123",
        threshold_version="thresh-v1",
        fx_rate_version="identity",
        evidence_quality=0.85,
        final_score=final_score,
        final_action=final_action,
    )


class TestAPISecurityAndIsolation:
    """Test suite for security boundaries and merchant data isolation."""

    def setup_method(self) -> None:
        self.client = TestClient(app)

    def test_missing_api_key_returns_401(self) -> None:
        resp = self.client.post("/v1/risk/evaluate", json={"transaction_id": "txn_no_auth", "merchant_id": "m_alpha", "amount": 100.0})
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "UNAUTHORIZED"

    def test_invalid_api_key_returns_401(self) -> None:
        resp = self.client.post(
            "/v1/risk/evaluate",
            headers={"X-API-Key": "ak_invalid_random_string"},
            json={"transaction_id": "txn_bad_auth", "merchant_id": "m_alpha", "amount": 100.0},
        )
        assert resp.status_code == 401

    def test_merchant_a_key_cannot_submit_for_merchant_b(self) -> None:
        # Key ak_test_alpha_456 is tied to merchant m_alpha
        resp = self.client.post(
            "/v1/risk/evaluate",
            headers={"X-API-Key": "ak_test_alpha_456"},
            json={"transaction_id": "txn_cross_submit", "merchant_id": "m_beta", "amount": 100.0},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"
        assert "not authorized to access data for merchant 'm_beta'" in resp.json()["error"]["message"]

    def test_merchant_a_key_cannot_read_merchant_b_transaction(self) -> None:
        # Create a transaction belonging to m_beta
        snap = make_dummy_snapshot("txn_beta_secret", merchant_id="m_beta", final_score=0.85, final_action=RecommendedAction.BLOCK)
        audit_repo.save_snapshot(snap)

        # Merchant A tries to query Merchant B's transaction
        resp = self.client.get(
            "/v1/risk/transactions/txn_beta_secret",
            headers={"X-API-Key": "ak_test_alpha_456"},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"

    def test_merchant_a_key_cannot_replay_merchant_b_transaction(self) -> None:
        snap = make_dummy_snapshot("txn_beta_replay", merchant_id="m_beta", final_score=0.85, final_action=RecommendedAction.BLOCK)
        audit_repo.save_snapshot(snap)

        # Merchant A tries to replay Merchant B's transaction
        resp = self.client.post(
            "/v1/risk/transactions/txn_beta_replay/replay",
            headers={"X-API-Key": "ak_test_alpha_456"},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "FORBIDDEN"

    def test_raw_pan_is_strictly_rejected(self) -> None:
        # Standard Visa test card PAN passing Luhn algorithm: 4111 1111 1111 1111
        resp = self.client.post(
            "/v1/risk/evaluate",
            headers={"X-API-Key": "ak_test_alpha_456"},
            json={
                "transaction_id": "txn_pan_leak",
                "merchant_id": "m_alpha",
                "amount": 50.0,
                "payment_instrument_token": "4111111111111111",  # Raw PAN
            },
        )
        assert resp.status_code == 422
        assert "Raw Primary Account Number (PAN) is strictly rejected" in str(resp.json())

    def test_raw_cvv_is_strictly_rejected(self) -> None:
        resp = self.client.post(
            "/v1/risk/evaluate",
            headers={"X-API-Key": "ak_test_alpha_456"},
            json={
                "transaction_id": "txn_cvv_leak",
                "merchant_id": "m_alpha",
                "amount": 50.0,
                "payment_instrument_token": "cvv_123",  # Raw CVV attempt
            },
        )
        assert resp.status_code == 422
        assert "Raw CVV/CVC is strictly rejected" in str(resp.json())
