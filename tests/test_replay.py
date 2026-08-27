"""Unit tests for Phase 4 Deterministic Decision Replay."""

import pytest
from app.audit.models import RiskDecisionSnapshot
from app.audit.replay import replay_decision
from app.calibration.models import CalibrationConfig, ThresholdConfig
from app.models.firewall import RecommendedAction


class TestDeterministicReplayEngine:
    def test_exact_deterministic_replay_match(self):
        cfg = CalibrationConfig(
            config_id="c_rep", version="cal-rep-v1",
            created_at="2026-08-01T00:00:00Z", training_window_start="2026-01-01T00:00:00Z",
            training_window_end="2026-06-01T00:00:00Z", feature_names=["velocity_score"],
            weights={"velocity_score": 1.0}, intercept=-1.0, dataset_hash="dhash",
        )
        snapshot = RiskDecisionSnapshot(
            transaction_id="txn_rep_1", session_id="sess_rep", merchant_id="m1",
            timestamp="2026-07-20T10:00:00Z",
            feature_values={"velocity_score": 0.5},
            feature_contributions={"velocity": 0.5},
            calibration_version="cal-rep-v1", calibration_hash="h1",
            threshold_version="thresh-v1", fx_rate_version="identity",
            evidence_quality=0.80, final_score=0.3775, final_action=RecommendedAction.CHALLENGE,
        )

        res = replay_decision(snapshot, config=cfg)
        assert res.deterministic_match is True
        assert res.score_delta <= 0.001
        assert res.replayed_decision == RecommendedAction.CHALLENGE

    def test_replay_diagnoses_input_mismatch(self):
        cfg_modified = CalibrationConfig(
            config_id="c_mod", version="cal-mod-v2",
            created_at="2026-08-01T00:00:00Z", training_window_start="2026-01-01T00:00:00Z",
            training_window_end="2026-06-01T00:00:00Z", feature_names=["velocity_score"],
            weights={"velocity_score": 5.0}, intercept=2.0, dataset_hash="dhash",
        )
        snapshot = RiskDecisionSnapshot(
            transaction_id="txn_rep_2", session_id="sess_rep", merchant_id="m1",
            timestamp="2026-07-20T10:00:00Z",
            feature_values={"velocity_score": 0.1},
            feature_contributions={"velocity": 0.1},
            calibration_version="cal-mod-v2", calibration_hash="h1",
            threshold_version="thresh-v1", fx_rate_version="identity",
            evidence_quality=0.80, final_score=0.10, final_action=RecommendedAction.ALLOW,
        )

        res = replay_decision(snapshot, config=cfg_modified)
        assert res.deterministic_match is False
        assert res.score_delta > 0.50
        assert "original_score" in res.input_diff
