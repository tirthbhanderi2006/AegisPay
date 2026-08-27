"""Aggregate production metrics tracking."""

from typing import Any, Dict, List
from pydantic import BaseModel, Field


class ProductionMetricsSnapshot(BaseModel):
    """Snapshot of production operational metrics."""
    window_start: str
    window_end: str
    total_evaluations: int = 0
    allow_count: int = 0
    challenge_count: int = 0
    block_count: int = 0
    allow_percentage: float = 0.0
    challenge_percentage: float = 0.0
    block_percentage: float = 0.0
    average_risk_score: float = 0.0
    average_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0


def compute_production_metrics(records: List[Dict[str, Any]]) -> ProductionMetricsSnapshot:
    """Compute aggregate metric statistics over evaluation logs."""
    if not records:
        return ProductionMetricsSnapshot(window_start="N/A", window_end="N/A")

    total = len(records)
    allow_c = sum(1 for r in records if r.get("action") == "ALLOW" or r.get("final_action") == "ALLOW")
    chal_c = sum(1 for r in records if r.get("action") == "CHALLENGE" or r.get("final_action") == "CHALLENGE")
    block_c = sum(1 for r in records if r.get("action") == "BLOCK" or r.get("final_action") == "BLOCK")

    scores = [float(r.get("risk_score", r.get("final_score", 0.0))) for r in records]
    avg_score = round(sum(scores) / total, 4) if scores else 0.0

    latencies = sorted([float(r.get("latency_ms", 1.0)) for r in records])
    avg_lat = round(sum(latencies) / total, 2) if latencies else 0.0
    p95_lat = latencies[int(0.95 * total)] if latencies else 0.0
    p99_lat = latencies[int(0.99 * total)] if latencies else 0.0

    w_start = str(records[0].get("timestamp", "N/A"))
    w_end = str(records[-1].get("timestamp", "N/A"))

    return ProductionMetricsSnapshot(
        window_start=w_start,
        window_end=w_end,
        total_evaluations=total,
        allow_count=allow_c,
        challenge_count=chal_c,
        block_count=block_c,
        allow_percentage=round((allow_c / total) * 100, 2),
        challenge_percentage=round((chal_c / total) * 100, 2),
        block_percentage=round((block_c / total) * 100, 2),
        average_risk_score=avg_score,
        average_latency_ms=avg_lat,
        p95_latency_ms=p95_lat,
        p99_latency_ms=p99_lat,
    )
