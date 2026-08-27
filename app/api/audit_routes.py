"""FastAPI routes for Phase 4 decision audit snapshots and deterministic replay."""

import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException

from app.audit.repository import audit_repo
from app.audit.replay import replay_decision

logger = logging.getLogger(__name__)

audit_router = APIRouter(tags=["Audit & Replay"])


@audit_router.get("/risk/audit/{transaction_id}", response_model=Dict[str, Any])
async def get_risk_audit(transaction_id: str) -> Dict[str, Any]:
    """Retrieve immutable audit snapshot for a transaction decision."""
    snapshot = audit_repo.get_snapshot(transaction_id)
    if not snapshot:
        raise HTTPException(
            status_code=404,
            detail=f"Audit snapshot not found for transaction: {transaction_id}",
        )
    return snapshot.to_audit_dict()


@audit_router.post("/risk/replay/{transaction_id}", response_model=Dict[str, Any])
async def replay_risk_decision(transaction_id: str) -> Dict[str, Any]:
    """Replay a historical transaction decision and verify determinism."""
    snapshot = audit_repo.get_snapshot(transaction_id)
    if not snapshot:
        raise HTTPException(
            status_code=404,
            detail=f"Audit snapshot not found for transaction: {transaction_id}",
        )
    result = replay_decision(snapshot)
    return {
        "transaction_id": result.transaction_id,
        "original_decision": result.original_decision.value if hasattr(result.original_decision, "value") else str(result.original_decision),
        "replayed_decision": result.replayed_decision.value if hasattr(result.replayed_decision, "value") else str(result.replayed_decision),
        "original_score": result.original_score,
        "replayed_score": result.replayed_score,
        "score_delta": result.score_delta,
        "calibration_version": result.calibration_version,
        "graph_snapshot_version": result.graph_snapshot_version,
        "deterministic_match": result.deterministic_match,
        "input_diff": result.input_diff,
    }
