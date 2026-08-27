"""Repository for API Key storage (in-memory and PostgreSQL)."""

from typing import Dict, List, Optional
from app.auth.api_keys import hash_api_key
from app.auth.models import APIKeyRecord, MerchantRole

CREATE_API_KEYS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS api_keys (
    key_id VARCHAR(64) PRIMARY KEY,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    merchant_id VARCHAR(128) NOT NULL,
    name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rate_limit_rpm INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_merchant ON api_keys(merchant_id);
"""


class APIKeyRepository:
    """In-memory and PostgreSQL repository for API key records."""

    def __init__(self) -> None:
        self._keys_by_hash: Dict[str, APIKeyRecord] = {}
        self._keys_by_id: Dict[str, APIKeyRecord] = {}
        self._seed_default_keys()

    def _seed_default_keys(self) -> None:
        """Seed default sandbox and test API keys."""
        # Key: ak_test_sandbox_123 -> merchant_id: m_sandbox
        self.register_raw_key("ak_test_sandbox_123", "m_sandbox", name="Sandbox Default Key", role=MerchantRole.SANDBOX_USER)
        # Key: ak_test_alpha_456 -> merchant_id: m_alpha
        self.register_raw_key("ak_test_alpha_456", "m_alpha", name="Merchant Alpha Key", role=MerchantRole.MERCHANT_ADMIN)
        # Key: ak_test_beta_789 -> merchant_id: m_beta
        self.register_raw_key("ak_test_beta_789", "m_beta", name="Merchant Beta Key", role=MerchantRole.MERCHANT_ADMIN)
        # Gateway Admin Key
        self.register_raw_key("ak_test_gateway_admin", "gateway_operator", name="Gateway Admin Key", role=MerchantRole.GATEWAY_OPERATOR)

    def register_raw_key(
        self,
        raw_key: str,
        merchant_id: str,
        name: str = "API Key",
        role: MerchantRole = MerchantRole.MERCHANT_ADMIN,
        rate_limit_rpm: int = 1000,
    ) -> APIKeyRecord:
        """Register a raw key by hashing it before storage."""
        kh = hash_api_key(raw_key)
        key_id = f"key_{kh[:12]}"
        rec = APIKeyRecord(
            key_id=key_id,
            key_hash=kh,
            merchant_id=merchant_id,
            name=name,
            role=role,
            is_active=True,
            rate_limit_rpm=rate_limit_rpm,
        )
        self._keys_by_hash[kh] = rec
        self._keys_by_id[key_id] = rec
        return rec

    def get_by_key_hash(self, key_hash: str) -> Optional[APIKeyRecord]:
        rec = self._keys_by_hash.get(key_hash)
        if rec and rec.is_active:
            return rec
        return None

    def get_by_raw_key(self, raw_key: str) -> Optional[APIKeyRecord]:
        kh = hash_api_key(raw_key)
        return self.get_by_key_hash(kh)

    def list_merchant_keys(self, merchant_id: str) -> List[APIKeyRecord]:
        return [k for k in self._keys_by_id.values() if k.merchant_id == merchant_id]


# Global singleton instance
api_key_repo = APIKeyRepository()
