"""Versioned configuration registry and rollback manager for calibration models.

Provides immutable storage, hash integrity validation, safe promotion, and deterministic rollback.
"""

from datetime import datetime, timezone
import hashlib
import json
import logging
import threading
from typing import Dict, List, Optional

from app.calibration.models import (
    CalibrationConfig,
    ThresholdConfig,
)

logger = logging.getLogger(__name__)


# Default safe heuristic configuration (fallback baseline)
DEFAULT_HEURISTIC_CONFIG = CalibrationConfig(
    config_id="cal_cfg_default_heuristic",
    version="calibration-heuristic-v1.0",
    created_at="2026-08-01T00:00:00Z",
    training_window_start="2026-01-01T00:00:00Z",
    training_window_end="2026-06-30T23:59:59Z",
    feature_names=[
        "velocity_score",
        "retry_frequency_score",
        "infrastructure_risk_score",
        "variation_anomaly_score",
        "historical_deviation_score",
        "sequence_anomaly_score",
        "device_reuse_rate",
        "ip_failure_rate",
        "cross_merchant_propagated_risk",
        "historical_failure_rate",
    ],
    weights={
        "velocity_score": 0.25,
        "retry_frequency_score": 0.20,
        "infrastructure_risk_score": 0.20,
        "variation_anomaly_score": 0.15,
        "historical_deviation_score": 0.10,
        "sequence_anomaly_score": 0.10,
        "device_reuse_rate": 0.30,
        "ip_failure_rate": 0.30,
        "cross_merchant_propagated_risk": 0.50,
        "historical_failure_rate": 0.35,
    },
    intercept=-0.10,
    thresholds=ThresholdConfig(
        version="thresh-default-v1.0",
        low_threshold=0.30,
        high_threshold=0.70,
        evidence_quality_threshold=0.70,
    ),
    dataset_hash="heuristic_baseline_default",
    created_by="system_default",
)


class CalibrationRegistry:
    """Thread-safe registry for versioned CalibrationConfig objects."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._configs: Dict[str, CalibrationConfig] = {}
        self._history: List[str] = []  # Chronological order of promoted versions
        self._active_version: str = DEFAULT_HEURISTIC_CONFIG.version

        # Seed default config
        self.register(DEFAULT_HEURISTIC_CONFIG)
        self._history.append(DEFAULT_HEURISTIC_CONFIG.version)

    def register(self, config: CalibrationConfig) -> bool:
        """Register a new calibration configuration with hash validation."""
        with self._lock:
            # Verify SHA-256 integrity
            computed_hash = config.compute_config_hash()
            if config.config_hash and config.config_hash != computed_hash:
                logger.error(
                    "Calibration config hash mismatch for %s: expected %s, got %s",
                    config.version, config.config_hash, computed_hash
                )
                return False
            config.config_hash = computed_hash
            self._configs[config.version] = config
            return True

    def promote(self, version: str) -> bool:
        """Promote a registered calibration version to ACTIVE state."""
        with self._lock:
            if version not in self._configs:
                logger.error("Cannot promote non-existent configuration version: %s", version)
                return False
            config = self._configs[version]
            # Integrity check prior to promotion
            if config.compute_config_hash() != config.config_hash:
                logger.error("Promotion failed: integrity hash mismatch for %s", version)
                return False

            self._active_version = version
            if not self._history or self._history[-1] != version:
                self._history.append(version)
            logger.info("Promoted calibration configuration to active: %s", version)
            return True

    def rollback(self) -> Optional[CalibrationConfig]:
        """Deterministically roll back to the previously active verified configuration."""
        with self._lock:
            if len(self._history) <= 1:
                logger.warning("No prior configuration in history to roll back to. Keeping active: %s", self._active_version)
                return self._configs.get(self._active_version)

            # Pop the currently active version
            bad_version = self._history.pop()
            prev_version = self._history[-1]
            self._active_version = prev_version
            logger.warning("Rolled back calibration configuration from %s to %s", bad_version, prev_version)
            return self._configs.get(prev_version)

    def get_active(self) -> CalibrationConfig:
        """Retrieve the currently active verified calibration configuration."""
        with self._lock:
            cfg = self._configs.get(self._active_version)
            if not cfg:
                return DEFAULT_HEURISTIC_CONFIG
            return cfg

    def get(self, version: str) -> Optional[CalibrationConfig]:
        """Retrieve a specific version of calibration configuration."""
        with self._lock:
            return self._configs.get(version)

    def list_versions(self) -> List[str]:
        """List all registered configuration versions."""
        with self._lock:
            return list(self._configs.keys())


# Global singleton registry instance
calibration_registry = CalibrationRegistry()
