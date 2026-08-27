"""Unit and integration tests for Phase 4 Risk Calibration."""

import pytest
from datetime import datetime
from app.calibration.models import (
    CalibrationConfig,
    ThresholdConfig,
    CalibrationMetrics,
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
)
from app.calibration.registry import (
    CalibrationRegistry,
    DEFAULT_HEURISTIC_CONFIG,
)
from app.entity_intelligence.synthetic import generate_cross_merchant_dataset


class TestCalibrationModelsAndMetrics:
    def test_brier_score_perfect_prediction(self):
        probs = [1.0, 0.0, 1.0, 0.0]
        labels = [1, 0, 1, 0]
        assert compute_brier_score(probs, labels) == 0.0

    def test_brier_score_worst_prediction(self):
        probs = [0.0, 1.0]
        labels = [1, 0]
        assert compute_brier_score(probs, labels) == 1.0

    def test_expected_calibration_error(self):
        probs = [0.1, 0.2, 0.8, 0.9]
        labels = [0, 0, 1, 1]
        ece = compute_expected_calibration_error(probs, labels, num_bins=5)
        assert 0.0 <= ece <= 0.3

    def test_roc_auc_perfect_separation(self):
        probs = [0.9, 0.8, 0.7, 0.2, 0.1]
        labels = [1, 1, 1, 0, 0]
        assert compute_roc_auc(probs, labels) == 1.0

    def test_pr_auc_calculation(self):
        probs = [0.9, 0.8, 0.3, 0.1]
        labels = [1, 1, 0, 0]
        assert compute_pr_auc(probs, labels) >= 0.80

    def test_config_hash_determinism(self):
        cfg1 = CalibrationConfig(
            config_id="c1",
            version="v1",
            created_at="2026-08-01T00:00:00Z",
            training_window_start="2026-01-01T00:00:00Z",
            training_window_end="2026-06-01T00:00:00Z",
            feature_names=["f1", "f2"],
            weights={"f1": 0.5, "f2": 0.3},
            intercept=-0.1,
            dataset_hash="hash123",
        )
        cfg2 = CalibrationConfig(
            config_id="c1",
            version="v1",
            created_at="2026-08-01T00:00:00Z",
            training_window_start="2026-01-01T00:00:00Z",
            training_window_end="2026-06-01T00:00:00Z",
            feature_names=["f2", "f1"],
            weights={"f2": 0.3, "f1": 0.5},
            intercept=-0.1,
            dataset_hash="hash123",
        )
        assert cfg1.config_hash == cfg2.config_hash


class TestChronologicalSplittingAndTraining:
    def test_chronological_splitting_order(self):
        dataset = generate_cross_merchant_dataset(sample_count=100, seed=42)
        train, val, test = split_chronological_dataset(dataset, train_ratio=0.6, val_ratio=0.2)
        assert len(train) == 60
        assert len(val) == 20
        assert len(test) == 20

    def test_offline_training_produces_valid_config(self):
        dataset = generate_cross_merchant_dataset(sample_count=100, seed=42)
        train, val, test = split_chronological_dataset(dataset, train_ratio=0.6, val_ratio=0.2)
        res = train_logistic_calibration(train, val, test, version="test-cal-v1.0", epochs=50)
        assert res.config.version == "test-cal-v1.0"
        assert len(res.config.weights) == 10
        assert res.validation_metrics.f1 >= 0.70
        assert res.test_metrics is not None


class TestCalibrationRegistryAndRollback:
    def test_registry_registration_and_promotion(self):
        reg = CalibrationRegistry()
        cfg = CalibrationConfig(
            config_id="c_test",
            version="cal-test-v2.0",
            created_at="2026-08-01T00:00:00Z",
            training_window_start="2026-01-01T00:00:00Z",
            training_window_end="2026-06-01T00:00:00Z",
            feature_names=["f1"],
            weights={"f1": 0.5},
            intercept=-0.1,
            dataset_hash="hash_abc",
        )
        assert reg.register(cfg) is True
        assert reg.promote("cal-test-v2.0") is True
        assert reg.get_active().version == "cal-test-v2.0"

    def test_deterministic_rollback_to_prior_version(self):
        reg = CalibrationRegistry()
        cfg1 = CalibrationConfig(
            config_id="c1", version="cal-v1", created_at="2026-08-01T00:00:00Z",
            training_window_start="2026-01-01T00:00:00Z", training_window_end="2026-06-01T00:00:00Z",
            feature_names=["f1"], weights={"f1": 0.5}, intercept=-0.1, dataset_hash="h1",
        )
        cfg2 = CalibrationConfig(
            config_id="c2", version="cal-v2", created_at="2026-08-02T00:00:00Z",
            training_window_start="2026-01-01T00:00:00Z", training_window_end="2026-06-01T00:00:00Z",
            feature_names=["f1"], weights={"f1": 0.8}, intercept=-0.2, dataset_hash="h2",
        )
        reg.register(cfg1)
        reg.promote("cal-v1")
        reg.register(cfg2)
        reg.promote("cal-v2")
        assert reg.get_active().version == "cal-v2"

        # Rollback
        rolled = reg.rollback()
        assert rolled is not None
        assert rolled.version == "cal-v1"
        assert reg.get_active().version == "cal-v1"
