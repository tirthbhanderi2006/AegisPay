"""Deterministic alert evaluation for drift and risk anomalies."""

from typing import Any, Dict, List
from pydantic import BaseModel


class DriftAlert(BaseModel):
    """Deterministic alert payload."""
    severity: str  # "INFO", "WARNING", "CRITICAL"
    metric_name: str
    psi_value: float
    message: str
    suggested_action: str


def evaluate_drift_alerts(drift_report: Dict[str, Any]) -> List[DriftAlert]:
    """Generate alerts from drift metrics against deterministic industry standard thresholds.
    
    PSI < 0.10: Insignificant change (No action)
    0.10 <= PSI < 0.25: Moderate shift (Warning: schedule re-calibration review)
    PSI >= 0.25: Significant shift (Critical: immediate model re-calibration required)
    """
    alerts: List[DriftAlert] = []

    # Score drift
    score_psi = drift_report.get("score_drift_psi", 0.0)
    if score_psi >= 0.25:
        alerts.append(DriftAlert(
            severity="CRITICAL",
            metric_name="score_distribution",
            psi_value=score_psi,
            message=f"Overall risk score distribution shifted significantly (PSI={score_psi:.4f} >= 0.25)",
            suggested_action="Perform offline re-calibration on recent historical data window.",
        ))
    elif score_psi >= 0.10:
        alerts.append(DriftAlert(
            severity="WARNING",
            metric_name="score_distribution",
            psi_value=score_psi,
            message=f"Moderate drift detected in risk scores (PSI={score_psi:.4f})",
            suggested_action="Monitor next evaluation window; prepare calibration candidates.",
        ))

    # Feature drifts
    for feat_name, metrics in drift_report.get("feature_drift", {}).items():
        psi = metrics.get("psi", 0.0)
        if psi >= 0.25:
            alerts.append(DriftAlert(
                severity="CRITICAL",
                metric_name=f"feature:{feat_name}",
                psi_value=psi,
                message=f"Feature '{feat_name}' shifted significantly (PSI={psi:.4f} >= 0.25)",
                suggested_action=f"Inspect telemetry data sources for feature '{feat_name}'.",
            ))
        elif psi >= 0.10:
            alerts.append(DriftAlert(
                severity="WARNING",
                metric_name=f"feature:{feat_name}",
                psi_value=psi,
                message=f"Feature '{feat_name}' exhibits moderate drift (PSI={psi:.4f})",
                suggested_action=f"Track variance for feature '{feat_name}'.",
            ))

    return alerts
