"""Authentication and authorization models."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class MerchantRole(str, Enum):
    MERCHANT_ADMIN = "MERCHANT_ADMIN"
    GATEWAY_OPERATOR = "GATEWAY_OPERATOR"
    SANDBOX_USER = "SANDBOX_USER"
    READ_ONLY = "READ_ONLY"


class APIKeyRecord(BaseModel):
    """Internal stored API key record (only stores SHA-256 hash, never plaintext key)."""
    key_id: str
    key_hash: str
    merchant_id: str
    name: str = "Default Key"
    role: MerchantRole = MerchantRole.MERCHANT_ADMIN
    is_active: bool = True
    rate_limit_rpm: int = 1000
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_used_at: Optional[str] = None


class AuthenticatedMerchant(BaseModel):
    """Context object representing the authenticated caller."""
    merchant_id: str
    key_id: str
    role: MerchantRole
    rate_limit_rpm: int = 1000
