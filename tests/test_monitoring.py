"""Unit tests for Phase 4 Statistical Drift Monitoring and Alerts."""

import pytest
from app.monitoring.drift import compute_psi, compute_ks_statistic, analyze_drift
from app.monitoring.alerts import evaluate_drift_alerts
from app.monitoring.metrics import compute_production_metrics


class TestDriftMonitoringAndResilience:
    def test_psi_identical_distributions_is_zero(self):
        dist = [0.1, 0.2, 0.3, 0.4, 0.5] * 10
        assert compute_psi(dist, dist) == 0.0

    def test_psi_shifted_distribution_detects_drift(self):
        baseline = [0.1] * 50 + [0.2] * 50
        shifted = [0.8] * 50 + [0.9] * 50
        psi = compute_psi(baseline, shifted)
        assert psi > 0.25

    def test_ks_statistic_identical_is_zero(self):
        d = [1.0, 2.0, 3.0, 4.0]
        assert compute_ks_statistic(d, d) == 0.0

    def test_ks_statistic_divergent_distributions(self):
        s1 = [1.0, 2.0, 3.0]
        s2 = [10.0, 20.0, 30.0]
        assert compute_ks_statistic(s1, s2) == 1.0

    def test_drift_alert_generation(self):
        report = {
            "score_drift_psi": 0.35,
            "feature_drift": {
                "velocity_score": {"psi": 0.28, "ks_statistic": 0.45},
                "retry_frequency_score": {"psi": 0.05, "ks_statistic": 0.10},
            },
        }
        alerts = evaluate_drift_alerts(report)
        assert len(alerts) >= 2
        assert any(a.severity == "CRITICAL" and a.metric_name == "score_distribution" for a in alerts)
        assert any(a.severity == "CRITICAL" and "velocity_score" in a.metric_name for a in alerts)

    def test_production_metrics_summary(self):
        records = [
            {"final_action": "ALLOW", "risk_score": 0.1, "latency_ms": 1.2},
            {"final_action": "CHALLENGE", "risk_score": 0.5, "latency_ms": 1.5},
            {"final_action": "BLOCK", "risk_score": 0.9, "latency_ms": 2.0},
        ]
        metrics = compute_production_metrics(records)
        assert metrics.total_evaluations == 3
        assert metrics.allow_count == 1
        assert metrics.challenge_count == 1
        assert metrics.block_count == 1
        assert round(metrics.average_risk_score, 2) == 0.5
