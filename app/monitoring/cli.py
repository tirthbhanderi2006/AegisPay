"""CLI command for drift monitoring and alert inspection."""

import argparse
import json
import random
from typing import Any

from app.entity_intelligence.synthetic import generate_cross_merchant_dataset
from app.monitoring.drift import analyze_drift
from app.monitoring.alerts import evaluate_drift_alerts


def cmd_drift(args: Any) -> None:
    """Simulate a baseline dataset vs shifted current dataset and run statistical drift analysis."""
    # Baseline dataset
    baseline_samples = generate_cross_merchant_dataset(sample_count=200, seed=42)
    b_records = [
        {
            "velocity_score": s.get("features", {}).get("payment_velocity_1h", 0.0) if isinstance(s.get("features"), dict) else 0.0,
            "retry_frequency_score": s.get("features", {}).get("rapid_retry_count", 0.0) if isinstance(s.get("features"), dict) else 0.0,
            "infrastructure_risk_score": 0.1,
            "historical_failure_rate": 0.05,
            "risk_score": 0.15,
        }
        for s in baseline_samples
    ]

    # Current shifted dataset (simulated drift with higher failure rate and velocity)
    current_samples = generate_cross_merchant_dataset(sample_count=200, seed=99)
    c_records = [
        {
            "velocity_score": (s.get("features", {}).get("payment_velocity_1h", 0.0) if isinstance(s.get("features"), dict) else 0.0) * 1.5,
            "retry_frequency_score": (s.get("features", {}).get("rapid_retry_count", 0.0) if isinstance(s.get("features"), dict) else 0.0) + 1.0,
            "infrastructure_risk_score": 0.35,
            "historical_failure_rate": 0.25,
            "risk_score": 0.45,
        }
        for s in current_samples
    ]

    print("\n=== AegisPay Production Statistical Drift Report ===")
    report = analyze_drift(b_records, c_records)
    print(f"  Baseline Window Size: {report['baseline_sample_size']}")
    print(f"  Current Window Size:  {report['current_sample_size']}")
    print(f"  Risk Score PSI:       {report['score_drift_psi']:.4f}")
    print("\n  [Feature Drift Metrics]")
    for feat, metrics in report["feature_drift"].items():
        print(f"    - {feat:28s} PSI={metrics['psi']:.4f}  KS-Stat={metrics['ks_statistic']:.4f}")

    alerts = evaluate_drift_alerts(report)
    print(f"\n  [Active Alerts: {len(alerts)}]")
    for a in alerts:
        print(f"    [{a.severity}] {a.metric_name}: {a.message}")
        print(f"      Action: {a.suggested_action}")


def main() -> None:
    parser = argparse.ArgumentParser(description="AegisPay Drift Monitoring CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("drift", help="Run drift monitoring analysis")

    args = parser.parse_args()
    if args.command == "drift":
        cmd_drift(args)


if __name__ == "__main__":
    main()
