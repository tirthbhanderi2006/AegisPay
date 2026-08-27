"""AegisPay Error Handling and Contract Package."""

from app.errors.models import (
    ErrorCode,
    ErrorDetail,
    AegisErrorResponse,
    AegisAPIException,
)
from app.errors.handlers import register_error_handlers

__all__ = [
    "ErrorCode",
    "ErrorDetail",
    "AegisErrorResponse",
    "AegisAPIException",
    "register_error_handlers",
]
