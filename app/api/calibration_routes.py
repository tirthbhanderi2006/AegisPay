"""FastAPI routes for Phase 4 calibration configuration inspection."""

import logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from app.calibration.registry import calibration_registry

logger = logging.getLogger(__name__)

calibration_router = APIRouter(prefix="/calibration", tags=["Calibration"])


@calibration_router.get("/active", response_model=Dict[str, Any])
async def get_active_calibration() -> Dict[str, Any]:
    """Retrieve the currently active verified calibration configuration."""
    cfg = calibration_registry.get_active()
    return cfg.model_dump()


@calibration_router.get("/versions", response_model=List[str])
async def list_calibration_versions() -> List[str]:
    """List all registered calibration versions."""
    return calibration_registry.list_versions()


@calibration_router.get("/{version}", response_model=Dict[str, Any])
async def get_calibration_version(version: str) -> Dict[str, Any]:
    """Retrieve a specific calibration configuration version."""
    cfg = calibration_registry.get(version)
    if not cfg:
        raise HTTPException(
            status_code=404,
            detail=f"Calibration configuration version not found: {version}",
        )
    return cfg.model_dump()
