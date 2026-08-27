"""CLI commands for Phase 4 calibration workflows: train, evaluate, promote, rollback."""

import argparse
import json
import random
import sys
from typing import Any

from app.calibration.models import CalibrationConfig
from app.calibration.registry import calibration_registry
from app.calibration.trainer import split_chronological_dataset, train_logistic_calibration
from app.entity_intelligence.synthetic import generate_cross_merchant_dataset


def cmd_train(args: Any) -> None:
    """Train a new calibration version on synthetic or historical data."""
    rng = random.Random(args.seed)
    samples = generate_cross_merchant_dataset(sample_count=args.samples, seed=args.seed)
    train_set, val_set, test_set = split_chronological_dataset(samples, train_ratio=0.60, val_ratio=0.20)

    print(f"\n=== Training Offline Risk Calibration ({len(train_set)} train, {len(val_set)} val, {len(test_set)} test) ===")
    result = train_logistic_calibration(
        train_samples=train_set,
        val_samples=val_set,
        test_samples=test_set,
        version=args.version,
        epochs=args.epochs,
    )

    calibration_registry.register(result.config)
    if args.promote:
        calibration_registry.promote(result.config.version)

    print(f"  Configuration Version: {result.config.version}")
    print(f"  Config Hash:           {result.config.config_hash[:16]}...")
    print(f"  Intercept:             {result.config.intercept}")
    print(f"  Learned Weights:       {json.dumps(result.config.weights, indent=4)}")
    print(f"\n  [Validation Metrics (Tuned on Val)]")
    print(f"    Precision={result.validation_metrics.precision:.4f}  Recall={result.validation_metrics.recall:.4f}  F1={result.validation_metrics.f1:.4f}")
    print(f"    Brier Score={result.validation_metrics.brier_score:.4f}  ECE={result.validation_metrics.expected_calibration_error:.4f}")
    print(f"    ROC-AUC={result.validation_metrics.roc_auc:.4f}  PR-AUC={result.validation_metrics.pr_auc:.4f}")

    if result.test_metrics:
        print(f"\n  [Held-Out Test Metrics (ZERO TUNING - UNSEEN TEST PERIOD)]")
        print(f"    Precision={result.test_metrics.precision:.4f}  Recall={result.test_metrics.recall:.4f}  F1={result.test_metrics.f1:.4f}")
        print(f"    Brier Score={result.test_metrics.brier_score:.4f}  ECE={result.test_metrics.expected_calibration_error:.4f}")
        print(f"    ROC-AUC={result.test_metrics.roc_auc:.4f}  PR-AUC={result.test_metrics.pr_auc:.4f}")


def cmd_promote(args: Any) -> None:
    """Promote an existing registered calibration version to active."""
    success = calibration_registry.promote(args.version)
    if success:
        print(f"Successfully promoted calibration version to ACTIVE: {args.version}")
    else:
        print(f"Failed to promote calibration version: {args.version}", file=sys.stderr)
        sys.exit(1)


def cmd_rollback(args: Any) -> None:
    """Roll back to the previous verified calibration version."""
    cfg = calibration_registry.rollback()
    if cfg:
        print(f"Successfully rolled back to calibration version: {cfg.version} (hash: {cfg.config_hash[:16]}...)")
    else:
        print("Rollback failed or no prior configuration.", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="AegisPay Calibration CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # train
    p_train = subparsers.add_parser("train", help="Train a new offline calibration model")
    p_train.add_argument("--samples", type=int, default=500, help="Sample count")
    p_train.add_argument("--seed", type=int, default=42, help="Random seed")
    p_train.add_argument("--version", type=str, default="calibration-v1.0", help="Version name")
    p_train.add_argument("--epochs", type=int, default=150, help="Training epochs")
    p_train.add_argument("--promote", action="store_true", help="Promote immediately after training")

    # promote
    p_promote = subparsers.add_parser("promote", help="Promote a version to active")
    p_promote.add_argument("--version", type=str, required=True, help="Version name to promote")

    # rollback
    subparsers.add_parser("rollback", help="Roll back to previous active version")

    args = parser.parse_args()
    if args.command == "train":
        cmd_train(args)
    elif args.command == "promote":
        cmd_promote(args)
    elif args.command == "rollback":
        cmd_rollback(args)


if __name__ == "__main__":
    main()
