"""Tests for token bucket rate limiting and HTTP 429 status."""

from fastapi.testclient import TestClient
from app.main import app
from app.auth.rate_limiter import rate_limiter
from app.auth.repository import api_key_repo
from app.auth.models import MerchantRole


class TestRateLimiting:
    """Test suite for deterministic rate limiting."""

    def setup_method(self) -> None:
        rate_limiter.reset()
        self.client = TestClient(app)
        # Register a key with very low limit (2 RPM) for testing
        api_key_repo.register_raw_key(
            raw_key="ak_test_low_rpm_123",
            merchant_id="m_rate_limited_merchant",
            rate_limit_rpm=2,
            role=MerchantRole.MERCHANT_ADMIN,
        )
        self.headers = {"X-API-Key": "ak_test_low_rpm_123"}

    def test_requests_allowed_until_limit_exceeded(self) -> None:
        # Request 1: OK
        r1 = self.client.post(
            "/v1/risk/evaluate",
            headers=self.headers,
            json={"transaction_id": "txn_rl_1", "merchant_id": "m_rate_limited_merchant", "amount": 10.0},
        )
        assert r1.status_code == 200

        # Request 2: OK
        r2 = self.client.post(
            "/v1/risk/evaluate",
            headers=self.headers,
            json={"transaction_id": "txn_rl_2", "merchant_id": "m_rate_limited_merchant", "amount": 10.0},
        )
        assert r2.status_code == 200

        # Request 3: HTTP 429 Rate Limited
        r3 = self.client.post(
            "/v1/risk/evaluate",
            headers=self.headers,
            json={"transaction_id": "txn_rl_3", "merchant_id": "m_rate_limited_merchant", "amount": 10.0},
        )
        assert r3.status_code == 429
        assert r3.json()["error"]["code"] == "RATE_LIMITED"
        assert "Rate limit exceeded" in r3.json()["error"]["message"]
