"""API versioning rules and request tracing."""

import uuid
from typing import Optional
from fastapi import Request

API_V1_VERSION = "1.0.0"
API_V1_IMMUTABILITY_NOTICE = "AegisPay /v1 API is strictly immutable. Breaking changes require /v2."


def get_request_id(request: Request) -> str:
    """Extract or generate request_id for end-to-end tracing."""
    if hasattr(request.state, "request_id") and request.state.request_id:
        return request.state.request_id
    req_id = request.headers.get("X-Request-Id") or f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = req_id
    return req_id
