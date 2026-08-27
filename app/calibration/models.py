"""Domain models for Phase 4 deterministic risk calibration.

Defines immutable, versioned, hash-verified calibration structures,
threshold configurations, and evaluation metrics.
"""

from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


FEATURE_SCHEMA_VERSION = "v1.0"
CALIBRATION_SPEC_VERSION = "1.0"


class ThresholdConfig(BaseModel):
    """Threshold configuration for action decisioning."""
    version: str = "thresh-v1.0"
    low_threshold: float = Field(0.30, ge=0.0, le=1.0, description="Risk < low => ALLOW")
    high_threshold: float = Field(0.70, ge=0.0, le=1.0, description="Risk >= high => BLOCK (or CHALLENGE if evidence low)")
    evidence_quality_threshold: float = Field(0.70, ge=0.0, le=1.0, description="Minimum evidence quality required for hard BLOCK")


class CalibrationFeature(BaseModel):
    """Metadata and statistics for a calibrated feature."""
    name: str
    coefficient: float
    mean: float = 0.0
    std: float = 1.0
    min_val: float = 0.0
    max_val: float = 1.0
    description: str = ""


class CalibrationMetrics(BaseModel):
    """Evaluation metrics computed on validation or test sets."""
    sample_count: int
    precision: float
    recall: float
    f1: float
    fpr: float
    fnr: float
    roc_auc: float
    pr_auc: float
    brier_score: float
    expected_calibration_error: float
    confusion_matrix: Dict[str, int] = Field(default_factory=dict)
    decision_distribution: Dict[str, int] = Field(default_factory=dict)


class CalibrationConfig(BaseModel):
    """Frozen, immutable, hash-verified calibration configuration."""
    config_id: str
    version: str
    created_at: str
    training_window_start: str
    training_window_end: str
    feature_schema_version: str = FEATURE_SCHEMA_VERSION
    feature_names: List[str]
    weights: Dict[str, float]
    intercept: float
    thresholds: ThresholdConfig = Field(default_factory=ThresholdConfig)
    dataset_hash: str
    config_hash: str = ""
    model_type: str = "LOGISTIC_REGRESSION"
    created_by: str = "aegispay_offline_trainer"
    metrics_validation: Optional[CalibrationMetrics] = None

    def compute_config_hash(self) -> str:
        """Compute deterministic SHA-256 hash across canonical serialized fields."""
        payload = {
            "version": self.version,
            "training_window_start": self.training_window_start,
            "training_window_end": self.training_window_end,
            "feature_schema_version": self.feature_schema_version,
            "feature_names": sorted(self.feature_names),
            "weights": {k: round(self.weights[k], 6) for k in sorted(self.weights.keys())},
            "intercept": round(self.intercept, 6),
            "thresholds": self.thresholds.model_dump(),
            "dataset_hash": self.dataset_hash,
            "model_type": self.model_type,
        }
        raw = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def model_post_init(self, __context: Any) -> None:
        if not self.config_hash:
            self.config_hash = self.compute_config_hash()


class CalibrationResult(BaseModel):
    """Result of an offline calibration training run."""
    config: CalibrationConfig
    train_metrics: CalibrationMetrics
    validation_metrics: CalibrationMetrics
    test_metrics: Optional[CalibrationMetrics] = None
    is_promoted: bool = False
