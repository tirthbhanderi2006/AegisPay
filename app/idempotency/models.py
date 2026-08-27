"""Idempotency models and canonical hashing."""

from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


def compute_request_hash(payload: Any) -> str:
    """Compute deterministic SHA-256 hash of canonical JSON request."""
    if isinstance(payload, BaseModel):
        data = payload.model_dump()
    elif isinstance(payload, dict):
        data = payload
    else:
        data = {"data": str(payload)}
    canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


class IdempotencyRecord(BaseModel):
    """Stored record of an idempotent request."""
    idempotency_key: str
    merchant_id: str
    request_hash: str
    status_code: int = 200
    response_payload: Dict[str, Any]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
