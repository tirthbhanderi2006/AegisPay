"""Tests for API authentication, key hashing, and secret protection."""

import pytest
from app.auth.api_keys import generate_api_key, hash_api_key
from app.auth.models import MerchantRole
from app.auth.repository import api_key_repo
from app.auth.middleware import verify_merchant_ownership
from app.auth.models import AuthenticatedMerchant
from app.errors.models import AegisAPIException, ErrorCode


class TestAPIKeyAuthentication:
    """Test suite for API Key authentication and authorization."""

    def test_key_hashing_is_deterministic(self) -> None:
        raw_key = "ak_test_secret_key_12345"
        h1 = hash_api_key(raw_key)
        h2 = hash_api_key(raw_key)
        assert h1 == h2
        assert len(h1) == 64
        # Verify plaintext key is not stored
        assert raw_key not in h1

    def test_generate_api_key_returns_unique_tokens(self) -> None:
        k1_id, k1_raw, k1_hash = generate_api_key()
        k2_id, k2_raw, k2_hash = generate_api_key()
        assert k1_id != k2_id
        assert k1_raw != k2_raw
        assert k1_hash != k2_hash
        assert k1_raw.startswith("ak_live_")

    def test_repository_get_by_raw_key(self) -> None:
        rec = api_key_repo.get_by_raw_key("ak_test_sandbox_123")
        assert rec is not None
        assert rec.merchant_id == "m_sandbox"
        assert rec.role == MerchantRole.SANDBOX_USER

    def test_invalid_raw_key_returns_none(self) -> None:
        rec = api_key_repo.get_by_raw_key("ak_test_non_existent_key")
        assert rec is None

    def test_merchant_ownership_verification_allows_matching_merchant(self) -> None:
        auth_m = AuthenticatedMerchant(
            merchant_id="m_merchant_a",
            key_id="key_123",
            role=MerchantRole.MERCHANT_ADMIN,
        )
        # Should not raise
        verify_merchant_ownership(auth_m, "m_merchant_a")

    def test_merchant_ownership_verification_rejects_cross_merchant(self) -> None:
        auth_m = AuthenticatedMerchant(
            merchant_id="m_merchant_a",
            key_id="key_123",
            role=MerchantRole.MERCHANT_ADMIN,
        )
        with pytest.raises(AegisAPIException) as exc_info:
            verify_merchant_ownership(auth_m, "m_merchant_b")
        assert exc_info.value.code == ErrorCode.FORBIDDEN
        assert exc_info.value.status_code == 403

    def test_gateway_operator_can_access_any_merchant(self) -> None:
        auth_m = AuthenticatedMerchant(
            merchant_id="gateway_operator",
            key_id="key_gateway",
            role=MerchantRole.GATEWAY_OPERATOR,
        )
        # Should not raise for any merchant ID
        verify_merchant_ownership(auth_m, "m_merchant_a")
        verify_merchant_ownership(auth_m, "m_merchant_b")
