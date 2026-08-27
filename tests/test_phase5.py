"""Unified Phase 5 End-to-End Pipeline & Integration Test Suite."""

import time
from fastapi.testclient import TestClient
from app.main import app
from examples.merchant_client import AegisPayMerchantClient


class TestPhase5ComprehensiveIntegration:
    """Unified Phase 5 end-to-end integration and client tests."""

    def setup_method(self) -> None:
        self.client = TestClient(app)
        self.headers = {"X-API-Key": "ak_test_sandbox_123"}

    def test_multi_currency_evaluation_pipeline(self) -> None:
        currencies = [
            ("INR", 8300.0),
            ("EUR", 100.0),
            ("GBP", 100.0),
            ("AED", 100.0),
        ]
        for curr, amt in currencies:
            txn_id = f"txn_p5_curr_{curr}_{int(time.time())}"
            resp = self.client.post(
                "/v1/risk/evaluate",
                headers=self.headers,
                json={
                    "transaction_id": txn_id,
                    "merchant_id": "m_sandbox",
                    "amount": amt,
                    "currency": curr,
                    "timestamp": "2026-08-27T10:00:00Z",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["transaction_id"] == txn_id
            assert data["decision"] in ["ALLOW", "CHALLENGE", "BLOCK", "MANUAL_HOLD"]
            assert data["audit"]["recorded"] is True

    def test_standalone_merchant_client_class_logic(self) -> None:
        """Test the standalone client class logic (verification, payload assembly)."""
        client = AegisPayMerchantClient(
            base_url="http://mock",
            api_key="ak_test_sandbox_123",
            merchant_id="m_sandbox",
            webhook_secret="whsec_test_secret_123",
        )
        # Test client webhook verification logic
        raw_body = b'{"event":"risk.decision.created","transaction_id":"txn_123"}'
        ts = str(int(time.time()))
        import hmac, hashlib
        sig = hmac.new(b"whsec_test_secret_123", f"{ts}.".encode("utf-8") + raw_body, hashlib.sha256).hexdigest()
        sig_header = f"t={ts},v1={sig}"

        assert client.verify_inbound_webhook(sig_header, raw_body) is True

    def test_adversarial_amount_and_token_manipulation(self) -> None:
        # Negative amount -> 422
        r_neg = self.client.post(
            "/v1/risk/evaluate",
            headers=self.headers,
            json={"transaction_id": "txn_neg", "merchant_id": "m_sandbox", "amount": -100.0},
        )
        assert r_neg.status_code == 422

        # Invalid currency length -> 422
        r_curr = self.client.post(
            "/v1/risk/evaluate",
            headers=self.headers,
            json={"transaction_id": "txn_curr", "merchant_id": "m_sandbox", "amount": 100.0, "currency": "TOOLONG"},
        )
        assert r_curr.status_code == 422
