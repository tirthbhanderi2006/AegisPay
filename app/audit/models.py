"""Domain models for Phase 4 immutable decision audit and deterministic replay."""

from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.firewall import RecommendedAction


class RiskDecisionSnapshot(BaseModel):
    """Immutable audit snapshot of a complete risk decision."""
    transaction_id: str
    session_id: str
    merchant_id: str
    timestamp: str
    feature_values: Dict[str, float]
    feature_contributions: Dict[str, float]
    signals: List[Dict[str, Any]] = Field(default_factory=list)
    graph_snapshot_version: str = "graph-live"
    calibration_version: str
    calibration_hash: str
    threshold_version: str
    fx_rate_version: str
    feature_schema_version: str = "v1.0"
    evidence_quality: float
    final_score: float
    final_action: RecommendedAction
    decision_hash: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def compute_decision_hash(self) -> str:
        """Compute canonical SHA-256 hash over deterministic sorted fields."""
        payload = {
            "transaction_id": self.transaction_id,
            "session_id": self.session_id,
            "merchant_id": self.merchant_id,
            "timestamp": self.timestamp,
            "feature_values": {k: round(self.feature_values[k], 6) for k in sorted(self.feature_values.keys())},
            "feature_contributions": {k: round(self.feature_contributions[k], 6) for k in sorted(self.feature_contributions.keys())},
            "graph_snapshot_version": self.graph_snapshot_version,
            "calibration_version": self.calibration_version,
            "calibration_hash": self.calibration_hash,
            "threshold_version": self.threshold_version,
            "fx_rate_version": self.fx_rate_version,
            "feature_schema_version": self.feature_schema_version,
            "evidence_quality": round(self.evidence_quality, 4),
            "final_score": round(self.final_score, 4),
            "final_action": self.final_action.value if hasattr(self.final_action, "value") else str(self.final_action),
        }
        raw = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def model_post_init(self, __context: Any) -> None:
        if not self.decision_hash:
            self.decision_hash = self.compute_decision_hash()

    def to_audit_dict(self) -> Dict[str, Any]:
        """Sanitized audit view preserving privacy boundaries."""
        return {
            "transaction_id": self.transaction_id,
            "session_id": self.session_id,
            "merchant_id": self.merchant_id,
            "timestamp": self.timestamp,
            "decision": self.final_action.value if hasattr(self.final_action, "value") else str(self.final_action),
            "total_risk_score": self.final_score,
            "evidence_quality": self.evidence_quality,
            "calibration_version": self.calibration_version,
            "calibration_hash": self.calibration_hash[:16] + "...",
            "threshold_version": self.threshold_version,
            "fx_rate_version": self.fx_rate_version,
            "feature_contributions": self.feature_contributions,
            "signals": self.signals,
            "decision_hash": self.decision_hash,
            "created_at": self.created_at,
            "privacy_notice": "Audit snapshot exposes mathematical attributions only. Customer PII and counterparty merchant data are protected.",
        }


class ReplayResult(BaseModel):
    """Result of replaying a historical transaction decision."""
    transaction_id: str
    original_decision: RecommendedAction
    replayed_decision: RecommendedAction
    original_score: float
    replayed_score: float
    score_delta: float
    calibration_version: str
    graph_snapshot_version: str
    deterministic_match: bool
    input_diff: Dict[str, Any] = Field(default_factory=dict)
