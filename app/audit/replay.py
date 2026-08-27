"""Deterministic decision replay engine.

Re-evaluates risk decisions from immutable snapshots and verifies 100% mathematical reproducibility.
"""

import math
from typing import Any, Dict, Optional

from app.audit.models import ReplayResult, RiskDecisionSnapshot
from app.calibration.models import CalibrationConfig
from app.calibration.registry import calibration_registry
from app.firewall.policy import decide_action
from app.models.firewall import RecommendedAction


def _sigmoid(z: float) -> float:
    if z < -40.0:
        return 0.0
    if z > 40.0:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))


def replay_decision(
    snapshot: RiskDecisionSnapshot,
    config: Optional[CalibrationConfig] = None,
) -> ReplayResult:
    """Replay risk evaluation deterministically from snapshot data."""
    # Resolve calibration configuration
    if config is None:
        config = calibration_registry.get(snapshot.calibration_version)
        if config is None:
            config = calibration_registry.get_active()

    # Re-compute score deterministically from features
    feats = snapshot.feature_values
    intercept = config.intercept
    weights = config.weights

    linear_sum = intercept
    for k, w in weights.items():
        val = feats.get(k, 0.0)
        linear_sum += w * val

    # Cross-merchant direct max if present
    prop_risk = feats.get("cross_merchant_propagated_risk", 0.0)
    calibrated_prob = _sigmoid(linear_sum)
    replayed_score = round(max(calibrated_prob, prop_risk), 4)

    # Re-apply conservative policy
    low_thresh = config.thresholds.low_threshold if config.thresholds else 0.30
    high_thresh = config.thresholds.high_threshold if config.thresholds else 0.70
    eq_thresh = config.thresholds.evidence_quality_threshold if config.thresholds else 0.70

    replayed_action = decide_action(replayed_score, low_threshold=low_thresh, high_threshold=high_thresh)
    if replayed_action == RecommendedAction.BLOCK and snapshot.evidence_quality < eq_thresh and replayed_score < 0.85:
        replayed_action = RecommendedAction.CHALLENGE

    score_delta = round(abs(replayed_score - snapshot.final_score), 4)
    deterministic_match = (score_delta <= 0.001) and (replayed_action == snapshot.final_action)

    input_diff = {}
    if not deterministic_match:
        input_diff = {
            "original_score": snapshot.final_score,
            "replayed_score": replayed_score,
            "original_action": snapshot.final_action.value if hasattr(snapshot.final_action, "value") else str(snapshot.final_action),
            "replayed_action": replayed_action.value if hasattr(replayed_action, "value") else str(replayed_action),
            "calibration_used": config.version,
        }

    return ReplayResult(
        transaction_id=snapshot.transaction_id,
        original_decision=snapshot.final_action,
        replayed_decision=replayed_action,
        original_score=snapshot.final_score,
        replayed_score=replayed_score,
        score_delta=score_delta,
        calibration_version=config.version,
        graph_snapshot_version=snapshot.graph_snapshot_version,
        deterministic_match=deterministic_match,
        input_diff=input_diff,
    )
