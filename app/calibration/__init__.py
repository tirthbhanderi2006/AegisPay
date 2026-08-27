"""AegisPay Phase 4 Risk Calibration Package."""

from app.calibration.models import (
    CalibrationConfig,
    CalibrationFeature,
    CalibrationMetrics,
    CalibrationResult,
    ThresholdConfig,
    FEATURE_SCHEMA_VERSION,
)
from app.calibration.evaluation import (
    compute_brier_score,
    compute_expected_calibration_error,
    compute_roc_auc,
    compute_pr_auc,
    evaluate_predictions,
)
from app.calibration.trainer import (
    split_chronological_dataset,
    train_logistic_calibration,
    extract_feature_vector,
    CALIBRATED_FEATURE_NAMES,
)
from app.calibration.registry import (
    CalibrationRegistry,
    calibration_registry,
    DEFAULT_HEURISTIC_CONFIG,
)

__all__ = [
    "CalibrationConfig",
    "CalibrationFeature",
    "CalibrationMetrics",
    "CalibrationResult",
    "ThresholdConfig",
    "FEATURE_SCHEMA_VERSION",
    "compute_brier_score",
    "compute_expected_calibration_error",
    "compute_roc_auc",
    "compute_pr_auc",
    "evaluate_predictions",
    "split_chronological_dataset",
    "train_logistic_calibration",
    "extract_feature_vector",
    "CALIBRATED_FEATURE_NAMES",
    "CalibrationRegistry",
    "calibration_registry",
    "DEFAULT_HEURISTIC_CONFIG",
]
