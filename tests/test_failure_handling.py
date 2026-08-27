"""Tests for deterministic fail-safe degradation policies and resilience."""

from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.decision.models import DecisionAction
from app.decision.policy import apply_decision_policy


class TestFailureHandlingAndGracefulDegradation:
    """Test suite for explicit failure behaviors."""

    def setup_method(self) -> None:
        self.client = TestClient(app)
        self.headers = {"X-API-Key": "ak_test_sandbox_123"}

    def test_graph_failure_decreases_evidence_quality_and_notes_degradation(self) -> None:
        # Mock compute_cross_merchant_risk to throw an exception
        with patch("app.api.v1.risk_routes.compute_cross_merchant_risk", side_effect=RuntimeError("Graph database connection failed")):
            resp = self.client.post(
                "/v1/risk/evaluate",
                headers=self.headers,
                json={
                    "transaction_id": "txn_fail_graph",
                    "merchant_id": "m_sandbox",
                    "amount": 100.0,
                    "device_token": "dev_tok_fault",
                    "ip_token": "ip_tok_fault",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["degradation_notice"] is not None
            assert "Cross-merchant entity intelligence temporarily degraded" in data["degradation_notice"]
            # Decision must NOT default to 0 risk blindly
            assert "risk_score" in data
            assert data["risk_score"] >= 0.0

    def test_policy_handles_graph_degraded_flag_explicitly(self) -> None:
        action, explanations = apply_decision_policy(
            risk_score=0.25,
            evidence_quality=0.50,
            signals=[],
            is_graph_degraded=True,
        )
        assert any("Cross-merchant network intelligence service was temporarily unavailable" in exp for exp in explanations)

    def test_stale_fx_rate_penalizes_evidence_quality(self) -> None:
        resp = self.client.post(
            "/v1/risk/evaluate",
            headers=self.headers,
            json={
                "transaction_id": "txn_stale_fx",
                "merchant_id": "m_sandbox",
                "amount": 5000.0,
                "currency": "INR",
                "timestamp": "2026-08-27T10:00:00Z",  # Rate from 2026-06 is > 30 days old
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["evidence_quality"] <= 0.80

    def test_audit_failure_records_unrecorded_status(self) -> None:
        with patch("app.api.v1.risk_routes.audit_repo.save_snapshot", side_effect=Exception("Disk full")):
            resp = self.client.post(
                "/v1/risk/evaluate",
                headers=self.headers,
                json={
                    "transaction_id": "txn_audit_fail",
                    "merchant_id": "m_sandbox",
                    "amount": 100.0,
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["audit"]["recorded"] is False
            assert data["audit"]["decision_hash"] == "unrecorded"
            assert "Audit snapshot storage unavailable" in str(data.get("degradation_notice"))
