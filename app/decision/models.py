"""Decision models, response contracts, and state definitions."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.firewall import RecommendedAction, SignalSeverity


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DecisionAction(str, Enum):
    ALLOW = "ALLOW"
    CHALLENGE = "CHALLENGE"
    BLOCK = "BLOCK"
    MANUAL_HOLD = "MANUAL_HOLD"


class RiskSignalResponse(BaseModel):
    name: str
    severity: SignalSeverity
    value: Any
    contribution: float = 0.0
    description: str


class VersionInfo(BaseModel):
    calibration: str
    policy: str = "policy-v2.0"
    graph_snapshot: str = "graph-live"
    schema_version: str = "v1.0"


class AuditInfo(BaseModel):
    snapshot_id: str
    decision_hash: str
    recorded: bool = True


class RiskEvaluationResponse(BaseModel):
    """Explicit Public Contract for /v1/risk/evaluate."""
    transaction_id: str
    decision_id: str
    decision: DecisionAction
    risk_score: float
    risk_level: RiskLevel
    evidence_quality: float
    signals: List[RiskSignalResponse] = Field(default_factory=list)
    explanation: List[str] = Field(default_factory=list)
    versions: VersionInfo
    audit: AuditInfo
    calibration_version: str
    request_id: str
    latency_ms: float
    degradation_notice: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
