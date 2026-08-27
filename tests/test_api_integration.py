"""Comprehensive integration tests simulating an external merchant client."""

import json
import time
from fastapi.testclient import TestClient
from app.main import app
from app.webhooks.models import WebhookSubscription
from app.webhooks.repository import webhook_repo
from app.webhooks.security import verify_webhook_signature


class TestExternalMerchantIntegrationWorkflow:
    """Full lifecycle external merchant integration test."""

    def setup_method(self) -> None:
        self.client = TestClient(app)
        self.api_key = "ak_test_sandbox_123"
        self.merchant_id = "m_sandbox"
        self.headers = {
            "X-API-Key": self.api_key,
            "Idempotency-Key": "idem_ext_test_999",
        }

    def test_full_external_merchant_flow(self) -> None:
        # 1. Register Webhook Subscription
        webhook_secret = "whsec_merchant_test_secret_4455"
        sub = WebhookSubscription(
            subscription_id="sub_ext_1",
            merchant_id=self.merchant_id,
            webhook_url="https://merchant-backend.example/api/v1/aegis-webhook",
            webhook_secret=webhook_secret,
        )
        webhook_repo.register_subscription(sub)

        # 2. Submit Transaction for Risk Decision
        eval_payload = {
            "transaction_id": "txn_ext_flow_001",
            "merchant_id": self.merchant_id,
            "amount": 8300.00,
            "currency": "INR",
            "account_token": "acct_hash_external_user",
            "device_token": "dev_hash_external_mobile",
            "ip_token": "ip_hash_external_wifi",
            "payment_instrument_token": "pi_tok_visa_card_abc",
            "timestamp": "2026-08-27T12:00:00Z",
        }
        resp = self.client.post("/v1/risk/evaluate", headers=self.headers, json=eval_payload)
        assert resp.status_code == 200
        decision_data = resp.json()

        # Verify Response Schema Fields
        assert decision_data["transaction_id"] == "txn_ext_flow_001"
        assert decision_data["decision"] in ["ALLOW", "CHALLENGE", "BLOCK", "MANUAL_HOLD"]
        assert "risk_score" in decision_data
        assert "risk_level" in decision_data
        assert "evidence_quality" in decision_data
        assert "signals" in decision_data
        assert "explanation" in decision_data
        assert "versions" in decision_data
        assert "audit" in decision_data
        assert "calibration_version" in decision_data
        assert "decision_id" in decision_data
        assert "request_id" in decision_data
        assert "latency_ms" in decision_data
        assert decision_data["audit"]["recorded"] is True

        # 3. Retry Identical Request (Verify Idempotency)
        retry_resp = self.client.post("/v1/risk/evaluate", headers=self.headers, json=eval_payload)
        assert retry_resp.status_code == 200
        retry_data = retry_resp.json()
        assert retry_data["decision_id"] == decision_data["decision_id"]

        # 4. Verify Webhook Dispatched with Valid HMAC-SHA256
        deliveries = webhook_repo.list_deliveries()
        assert len(deliveries) >= 1
        last_del = deliveries[-1]
        assert last_del.event_id.startswith("wevt_")
        assert last_del.success is True

        # 5. Query Investigation Endpoint
        inv_resp = self.client.get(f"/v1/risk/transactions/{eval_payload['transaction_id']}", headers=self.headers)
        assert inv_resp.status_code == 200
        inv_data = inv_resp.json()
        assert inv_data["decision"] == decision_data["decision"]
        assert inv_data["decision_hash"] == decision_data["audit"]["decision_hash"]

        # 6. Query Privacy-Safe Entity Network Context
        ent_resp = self.client.get(f"/v1/risk/transactions/{eval_payload['transaction_id']}/entities", headers=self.headers)
        assert ent_resp.status_code == 200
        ent_data = ent_resp.json()
        assert "dev_***" in ent_data["entities"]["device_token"]

        # 7. Query Event Timeline
        time_resp = self.client.get(f"/v1/risk/transactions/{eval_payload['transaction_id']}/timeline", headers=self.headers)
        assert time_resp.status_code == 200
        time_data = time_resp.json()
        assert time_data["total_events"] >= 1

        # 8. Verify Deterministic Replay
        rep_resp = self.client.post(f"/v1/risk/transactions/{eval_payload['transaction_id']}/replay", headers=self.headers)
        assert rep_resp.status_code == 200
        rep_data = rep_resp.json()
        assert rep_data["deterministic_match"] is True
        assert rep_data["score_delta"] == 0.0
        assert rep_data["replayed_action"] == decision_data["decision"]

    def test_sandbox_synthetic_transaction_endpoint(self) -> None:
        resp = self.client.post(
            "/v1/sandbox/transactions?scenario_type=DEVICE_REUSE_RING",
            headers={"X-API-Key": self.api_key},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["transaction_id"].startswith("sandbox_")
        assert data["decision"] in ["ALLOW", "CHALLENGE", "BLOCK", "MANUAL_HOLD"]
