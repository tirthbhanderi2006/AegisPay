"""Standalone External Merchant Client Example for AegisPay Public API.

==============================================================================
CRITICAL ARCHITECTURAL GUARANTEE:
This client communicates SOLELY over HTTP / JSON with the public /v1 API endpoints.
It imports ZERO internal AegisPay application modules, repositories, or scoring code.
==============================================================================
"""

import hashlib
import hmac
import json
import logging
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="[MERCHANT-CLIENT] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


class AegisPayMerchantClient:
    """Production merchant client for integrating with AegisPay Risk Decisioning API."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8000",
        api_key: str = "ak_test_sandbox_123",
        merchant_id: str = "m_sandbox",
        webhook_secret: Optional[str] = "whsec_synthetic_sandbox_secret",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.merchant_id = merchant_id
        self.webhook_secret = webhook_secret

    def _request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Tuple[int, Dict[str, Any]]:
        """Execute raw HTTP request using standard library urllib."""
        url = f"{self.base_url}{path}"
        req_headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "User-Agent": "AegisPay-Merchant-SDK/1.0",
        }
        if headers:
            req_headers.update(headers)

        data_bytes = None
        if payload is not None:
            data_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")

        req = urllib.request.Request(url, data=data_bytes, headers=req_headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                status_code = resp.status
                body_bytes = resp.read()
                body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
                return status_code, body
        except urllib.error.HTTPError as e:
            err_body = json.loads(e.read().decode("utf-8")) if e.fp else {"message": str(e)}
            return e.code, err_body
        except Exception as e:
            logger.error("HTTP connection failed: %s", e)
            return 500, {"error": {"code": "CONNECTION_ERROR", "message": str(e)}}

    def evaluate_risk(
        self,
        transaction_id: str,
        amount: float,
        currency: str = "USD",
        account_token: Optional[str] = None,
        device_token: Optional[str] = None,
        ip_token: Optional[str] = None,
        payment_instrument_token: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Submit a transaction for real-time risk decisioning.

        Returns full parsed RiskEvaluationResponse.
        """
        payload = {
            "transaction_id": transaction_id,
            "merchant_id": self.merchant_id,
            "amount": amount,
            "currency": currency,
            "account_token": account_token,
            "device_token": device_token,
            "ip_token": ip_token,
            "payment_instrument_token": payment_instrument_token,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        custom_headers = {}
        if idempotency_key:
            custom_headers["Idempotency-Key"] = idempotency_key

        status_code, body = self._request("POST", "/v1/risk/evaluate", payload=payload, headers=custom_headers)
        if status_code != 200:
            logger.error("Risk evaluation failed with status %d: %s", status_code, body)
            raise RuntimeError(f"AegisPay error [{status_code}]: {body.get('error', {}).get('message', body)}")

        return body

    def get_transaction_details(self, transaction_id: str) -> Dict[str, Any]:
        """Investigate risk decision details for a transaction."""
        status_code, body = self._request("GET", f"/v1/risk/transactions/{transaction_id}")
        if status_code != 200:
            raise RuntimeError(f"Failed to fetch transaction [{status_code}]: {body}")
        return body

    def get_transaction_entities(self, transaction_id: str) -> Dict[str, Any]:
        """Retrieve privacy-safe entity network context for a transaction."""
        status_code, body = self._request("GET", f"/v1/risk/transactions/{transaction_id}/entities")
        if status_code != 200:
            raise RuntimeError(f"Failed to fetch entities [{status_code}]: {body}")
        return body

    def get_transaction_timeline(self, transaction_id: str) -> Dict[str, Any]:
        """Retrieve chronological event timeline visible at decision point."""
        status_code, body = self._request("GET", f"/v1/risk/transactions/{transaction_id}/timeline")
        if status_code != 200:
            raise RuntimeError(f"Failed to fetch timeline [{status_code}]: {body}")
        return body

    def verify_inbound_webhook(
        self,
        signature_header: str,
        raw_payload_bytes: bytes,
        max_drift_seconds: int = 300,
    ) -> bool:
        """Verify HMAC-SHA256 signature and replay-window timestamp on inbound webhook."""
        if not self.webhook_secret:
            raise ValueError("Webhook secret not configured on client")

        parts = dict(item.split("=", 1) for item in signature_header.split(",") if "=" in item)
        ts_str = parts.get("t")
        received_sig = parts.get("v1")

        if not ts_str or not received_sig:
            return False

        # Validate timestamp drift
        try:
            ts_val = float(ts_str)
            if abs(time.time() - ts_val) > max_drift_seconds:
                logger.warning("Webhook timestamp drift exceeds %ds", max_drift_seconds)
                return False
        except Exception:
            return False

        # Verify HMAC
        message = f"{ts_str}.".encode("utf-8") + raw_payload_bytes
        expected_sig = hmac.new(self.webhook_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

        return hmac.compare_digest(received_sig, expected_sig)


# ---------------------------------------------------------------------------
# Runnable Demonstration
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logger.info("Starting AegisPay External Merchant Client Demonstration...")

    # Using default sandbox credentials
    client = AegisPayMerchantClient(
        base_url="http://127.0.0.1:8000",
        api_key="ak_test_sandbox_123",
        merchant_id="m_sandbox",
    )

    txn_id = f"txn_demo_{int(time.time())}"
    idempotency_key = f"idem_{txn_id}"

    logger.info("Evaluating transaction %s with Idempotency-Key %s", txn_id, idempotency_key)

    try:
        # 1. First Evaluation Call
        decision_resp = client.evaluate_risk(
            transaction_id=txn_id,
            amount=8300.0,
            currency="INR",
            account_token="acct_usr_99812",
            device_token="dev_tok_iphone14_ab71",
            ip_token="ip_tok_103_21_244_0",
            payment_instrument_token="pi_tok_visa_4111",
            idempotency_key=idempotency_key,
        )

        logger.info(">>> Decision Received: %s (Risk Score: %.4f | Level: %s | EQ: %.2f)",
                    decision_resp["decision"], decision_resp["risk_score"], decision_resp["risk_level"], decision_resp["evidence_quality"])
        logger.info(">>> Explanations: %s", decision_resp.get("explanation", []))
        logger.info(">>> Audit Snapshot ID: %s | Decision Hash: %s",
                    decision_resp["audit"]["snapshot_id"], decision_resp["audit"]["decision_hash"])

        # 2. Retrying identical request with same Idempotency-Key
        logger.info("Retrying identical evaluation to verify idempotency...")
        cached_resp = client.evaluate_risk(
            transaction_id=txn_id,
            amount=8300.0,
            currency="INR",
            account_token="acct_usr_99812",
            device_token="dev_tok_iphone14_ab71",
            ip_token="ip_tok_103_21_244_0",
            payment_instrument_token="pi_tok_visa_4111",
            idempotency_key=idempotency_key,
        )
        assert cached_resp["decision_id"] == decision_resp["decision_id"], "Idempotency failed: decision_id mismatch"
        logger.info(">>> Idempotent match verified! Cached decision_id: %s", cached_resp["decision_id"])

        # 3. Investigation Query
        logger.info("Querying transaction investigation endpoint...")
        inv = client.get_transaction_details(txn_id)
        logger.info(">>> Stored Decision: %s | Calibration Ver: %s", inv["decision"], inv["calibration_version"])

        # 4. Privacy-Safe Entities
        entities = client.get_transaction_entities(txn_id)
        logger.info(">>> Privacy-Safe Entities: %s", entities["entities"])

        logger.info("External Merchant Client Demonstration completed successfully with ZERO internal imports!")

    except Exception as e:
        logger.info("Note: To run live against HTTP server, start uvicorn app.main:app first. (Local exception: %s)", e)
