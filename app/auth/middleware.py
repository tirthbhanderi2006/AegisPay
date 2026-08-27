"""FastAPI authentication middleware and dependencies."""

from typing import Optional
from fastapi import Header, Request, Security
from fastapi.security import APIKeyHeader

from app.auth.models import AuthenticatedMerchant, MerchantRole
from app.auth.repository import api_key_repo
from app.auth.rate_limiter import rate_limiter
from app.errors.models import AegisAPIException, ErrorCode

api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_authenticated_merchant(
    request: Request,
    x_api_key: Optional[str] = Security(api_key_header_scheme),
    authorization: Optional[str] = Header(None),
) -> AuthenticatedMerchant:
    """Validate API key from X-API-Key or Authorization header and apply rate limiting."""
    raw_key = x_api_key
    if not raw_key and authorization:
        if authorization.startswith("Bearer "):
            raw_key = authorization[7:].strip()
        elif authorization.startswith("ApiKey "):
            raw_key = authorization[7:].strip()
        else:
            raw_key = authorization.strip()

    if not raw_key:
        raise AegisAPIException(
            code=ErrorCode.UNAUTHORIZED,
            message="Missing API key. Provide 'X-API-Key' header or 'Authorization: Bearer <key>'.",
            status_code=401,
        )

    key_record = api_key_repo.get_by_raw_key(raw_key)
    if not key_record:
        raise AegisAPIException(
            code=ErrorCode.UNAUTHORIZED,
            message="Invalid or deactivated API key.",
            status_code=401,
        )

    # Check Rate Limiting
    allowed, remaining, reset_after = rate_limiter.is_allowed(
        identifier=key_record.merchant_id,
        limit_rpm=key_record.rate_limit_rpm,
    )
    if not allowed:
        raise AegisAPIException(
            code=ErrorCode.RATE_LIMITED,
            message=f"Rate limit exceeded ({key_record.rate_limit_rpm} RPM). Retry in {reset_after:.1f}s.",
            status_code=429,
            details={"retry_after_seconds": reset_after, "limit_rpm": key_record.rate_limit_rpm},
        )

    auth_merchant = AuthenticatedMerchant(
        merchant_id=key_record.merchant_id,
        key_id=key_record.key_id,
        role=key_record.role,
        rate_limit_rpm=key_record.rate_limit_rpm,
    )

    # Store in request state
    request.state.authenticated_merchant = auth_merchant
    return auth_merchant


def verify_merchant_ownership(auth_merchant: AuthenticatedMerchant, target_merchant_id: str) -> None:
    """Ensure caller is authorized for the target merchant ID."""
    # Gateway operators can view cross-merchant aggregates
    if auth_merchant.role == MerchantRole.GATEWAY_OPERATOR:
        return

    if auth_merchant.merchant_id != target_merchant_id:
        raise AegisAPIException(
            code=ErrorCode.FORBIDDEN,
            message=f"Forbidden: Authenticated merchant '{auth_merchant.merchant_id}' is not authorized to access data for merchant '{target_merchant_id}'.",
            status_code=403,
        )
