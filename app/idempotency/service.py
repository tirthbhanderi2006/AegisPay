"""Idempotency coordination service."""

from typing import Any, Dict, Optional, Tuple
from app.errors.models import AegisAPIException, ErrorCode
from app.idempotency.models import IdempotencyRecord, compute_request_hash
from app.idempotency.repository import idempotency_repo


def check_idempotency(
    merchant_id: str,
    idempotency_key: Optional[str],
    request_payload: Any,
) -> Tuple[Optional[Dict[str, Any]], str]:
    """Check if request was previously evaluated.

    Returns (cached_response, request_hash).
    Raises AegisAPIException(IDEMPOTENCY_CONFLICT) if key is reused with mismatched payload.
    """
    req_hash = compute_request_hash(request_payload)
    if not idempotency_key:
        return None, req_hash

    existing = idempotency_repo.get(merchant_id, idempotency_key)
    if existing:
        if existing.request_hash != req_hash:
            raise AegisAPIException(
                code=ErrorCode.IDEMPOTENCY_CONFLICT,
                message=f"Idempotency conflict: Idempotency-Key '{idempotency_key}' was previously used with a different request payload.",
                status_code=409,
            )
        return existing.response_payload, req_hash

    return None, req_hash


def record_idempotent_response(
    merchant_id: str,
    idempotency_key: Optional[str],
    request_hash: str,
    response_payload: Dict[str, Any],
    status_code: int = 200,
) -> None:
    """Persist successful response for idempotent replay."""
    if not idempotency_key:
        return

    record = IdempotencyRecord(
        idempotency_key=idempotency_key,
        merchant_id=merchant_id,
        request_hash=request_hash,
        status_code=status_code,
        response_payload=response_payload,
    )
    idempotency_repo.save(record)
