"""Tests for webhook security, HMAC-SHA256 signature verification, and replay validation."""

import json
import time
from app.webhooks.dispatcher import WebhookDispatcher
from app.webhooks.models import WebhookEventType, WebhookPayload, WebhookSubscription
from app.webhooks.repository import webhook_repo
from app.webhooks.security import generate_webhook_signature, verify_webhook_signature


class TestWebhookSecurityAndDispatch:
    """Test suite for HMAC signatures and webhook security."""

    def setup_method(self) -> None:
        webhook_repo.clear()

    def test_signature_generation_and_verification(self) -> None:
        secret = "whsec_test_secret_998877"
        payload = {"event": "risk.decision.created", "transaction_id": "txn_wh_1", "decision": "ALLOW"}
        ts = str(int(time.time()))

        sig_header = generate_webhook_signature(secret, ts, payload)
        raw_body = json.dumps(payload, sort_keys=True, separators=(",", ":"))

        is_valid, reason = verify_webhook_signature(secret, sig_header, raw_body)
        assert is_valid is True
        assert reason == "Valid"

    def test_signature_rejects_tampered_payload(self) -> None:
        secret = "whsec_test_secret_998877"
        payload = {"event": "risk.decision.created", "transaction_id": "txn_wh_1", "decision": "ALLOW"}
        ts = str(int(time.time()))

        sig_header = generate_webhook_signature(secret, ts, payload)
        tampered_body = json.dumps({"event": "risk.decision.created", "transaction_id": "txn_wh_1", "decision": "BLOCK"}, sort_keys=True)

        is_valid, reason = verify_webhook_signature(secret, sig_header, tampered_body)
        assert is_valid is False
        assert "Signature mismatch" in reason

    def test_replay_window_rejects_expired_timestamp(self) -> None:
        secret = "whsec_test_secret_998877"
        payload = {"transaction_id": "txn_old"}
        stale_ts = str(int(time.time() - 600))  # 10 minutes ago (> 300s window)

        sig_header = generate_webhook_signature(secret, stale_ts, payload)
        raw_body = json.dumps(payload, sort_keys=True, separators=(",", ":"))

        is_valid, reason = verify_webhook_signature(secret, sig_header, raw_body, max_drift_seconds=300)
        assert is_valid is False
        assert "replay window" in reason

    def test_dispatcher_logs_deliveries(self) -> None:
        sub = WebhookSubscription(
            subscription_id="sub_test_1",
            merchant_id="m_webhook_merchant",
            webhook_url="https://merchant.example.com/webhook",
            webhook_secret="whsec_sec_1",
        )
        webhook_repo.register_subscription(sub)

        dispatcher = WebhookDispatcher()
        payload = WebhookPayload(
            event=WebhookEventType.RISK_DECISION_CREATED,
            event_id="wevt_123",
            transaction_id="txn_123",
            merchant_id="m_webhook_merchant",
            decision_id="dec_123",
            decision="CHALLENGE",
            risk_score=0.65,
            risk_level="MEDIUM",
        )
        results = dispatcher.dispatch(payload)
        assert len(results) == 1
        assert results[0].success is True
        assert results[0].status_code == 200
