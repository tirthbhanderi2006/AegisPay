"""FastAPI exception handlers for consistent error contracts and request tracing."""

import logging
import uuid
from typing import Any
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.errors.models import AegisAPIException, AegisErrorResponse, ErrorCode, ErrorDetail

logger = logging.getLogger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    """Register uniform error handlers ensuring zero internal stack or DB leakage."""

    @app.exception_handler(AegisAPIException)
    async def aegis_api_exception_handler(request: Request, exc: AegisAPIException) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None) or str(uuid.uuid4())
        error_payload = AegisErrorResponse(
            error=ErrorDetail(
                code=exc.code,
                message=exc.message,
                request_id=req_id,
                field=exc.field,
                details=exc.details,
            )
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload.model_dump(exclude_none=True),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None) or str(uuid.uuid4())
        errors = exc.errors()
        first_err = errors[0] if errors else {}
        loc = ".".join(str(l) for l in first_err.get("loc", []) if l != "body")
        msg = first_err.get("msg", "Invalid request parameters")

        error_payload = AegisErrorResponse(
            error=ErrorDetail(
                code=ErrorCode.INVALID_REQUEST,
                message=f"Validation error on field '{loc}': {msg}" if loc else msg,
                request_id=req_id,
                field=loc or None,
                details={"errors": [{"field": ".".join(str(l) for l in e.get("loc", [])), "msg": e.get("msg")} for e in errors]},
            )
        )
        return JSONResponse(
            status_code=422,
            content=error_payload.model_dump(exclude_none=True),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None) or str(uuid.uuid4())
        code_map = {
            401: ErrorCode.UNAUTHORIZED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.NOT_FOUND,
            409: ErrorCode.IDEMPOTENCY_CONFLICT,
            429: ErrorCode.RATE_LIMITED,
            503: ErrorCode.DEPENDENCY_UNAVAILABLE,
        }
        code = code_map.get(exc.status_code, ErrorCode.INTERNAL_ERROR)

        error_payload = AegisErrorResponse(
            error=ErrorDetail(
                code=code,
                message=str(exc.detail),
                request_id=req_id,
            )
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload.model_dump(exclude_none=True),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        req_id = getattr(request.state, "request_id", None) or str(uuid.uuid4())
        logger.error("Unhandled exception for request %s: %s", req_id, exc, exc_info=True)
        # Never leak internal stack trace to caller
        error_payload = AegisErrorResponse(
            error=ErrorDetail(
                code=ErrorCode.INTERNAL_ERROR,
                message="An internal error occurred. Please reference the request_id for assistance.",
                request_id=req_id,
            )
        )
        return JSONResponse(
            status_code=500,
            content=error_payload.model_dump(exclude_none=True),
        )
