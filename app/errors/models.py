"""Error contract models and codes for AegisPay Public API."""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DEPENDENCY_UNAVAILABLE = "DEPENDENCY_UNAVAILABLE"


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    request_id: str
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class AegisErrorResponse(BaseModel):
    error: ErrorDetail


class AegisAPIException(Exception):
    """Base exception for AegisPay API errors."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = 400,
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.field = field
        self.details = details
