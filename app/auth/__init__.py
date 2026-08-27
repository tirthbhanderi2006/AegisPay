"""AegisPay Authentication and Rate Limiting Package."""

from app.auth.models import (
    MerchantRole,
    APIKeyRecord,
    AuthenticatedMerchant,
)
from app.auth.api_keys import (
    hash_api_key,
    generate_api_key,
)
from app.auth.rate_limiter import (
    RateLimiter,
    rate_limiter,
)
from app.auth.repository import (
    APIKeyRepository,
    api_key_repo,
)
from app.auth.middleware import (
    get_authenticated_merchant,
    verify_merchant_ownership,
)

__all__ = [
    "MerchantRole",
    "APIKeyRecord",
    "AuthenticatedMerchant",
    "hash_api_key",
    "generate_api_key",
    "RateLimiter",
    "rate_limiter",
    "APIKeyRepository",
    "api_key_repo",
    "get_authenticated_merchant",
    "verify_merchant_ownership",
]
