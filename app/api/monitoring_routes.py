"""FastAPI routes for Phase 4 production drift monitoring and metrics."""

import logging
from typing import Any, Dict
from fastapi import APIRouter

from app.audit.repository import audit_repo
from app.monitoring.drift import analyze_drift
from app.monitoring.alerts import evaluate_drift_alerts
from app.monitoring.metrics import compute_production_metrics

logger = logging.getLogger(__name__)

monitoring_router = APIRouter(prefix="/monitoring", tags=["Monitoring & Resilience"])


@monitoring_router.get("/drift", response_model=Dict[str, Any])
async def get_drift_analysis() -> Dict[str, Any]:
    """Retrieve statistical drift metrics across audit snapshots."""
    snapshots = audit_repo.list_snapshots(limit=200)
    records = [s.model_dump() for s in snapshots]

    if len(records) < 20:
        return {
            "status": "insufficient_data",
            "message": f"Need at least 20 snapshots for drift analysis, current count: {len(records)}",
            "score_drift_psi": 0.0,
            "feature_drift": {},
            "active_alerts": [],
        }

    mid = len(records) // 2
    b_records = records[:mid]
    c_records = records[mid:]

    report = analyze_drift(b_records, c_records)
    alerts = evaluate_drift_alerts(report)

    return {
        "status": "active",
        "score_drift_psi": report.get("score_drift_psi", 0.0),
        "feature_drift": report.get("feature_drift", {}),
        "baseline_sample_size": len(b_records),
        "current_sample_size": len(c_records),
        "active_alerts": [a.model_dump() for a in alerts],
    }


@monitoring_router.get("/metrics", response_model=Dict[str, Any])
async def get_production_metrics() -> Dict[str, Any]:
    """Retrieve aggregate production performance metrics."""
    snapshots = audit_repo.list_snapshots(limit=500)
    records = [s.model_dump() for s in snapshots]
    metrics = compute_production_metrics(records)
    return metrics.model_dump()
