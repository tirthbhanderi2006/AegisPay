"""Tests for decision lifecycle policy, conservative thresholds, and explanation templates."""

import pytest
from app.decision.models import DecisionAction, RiskLevel, RiskSignalResponse
from app.decision.policy import apply_decision_policy, determine_risk_level
from app.models.firewall import SignalSeverity


class TestDecisionPolicyEngine:
    """Test suite for policy transitions and explanation generation."""

    def test_determine_risk_level(self) -> None:
        assert determine_risk_level(0.15) == RiskLevel.LOW
        assert determine_risk_level(0.45) == RiskLevel.MEDIUM
        assert determine_risk_level(0.85) == RiskLevel.HIGH

    def test_low_risk_with_sufficient_evidence_allows(self) -> None:
        signals = [
            RiskSignalResponse(
                name="normal_velocity",
                severity=SignalSeverity.low,
                value=1,
                contribution=0.05,
                description="Low velocity",
            )
        ]
        action, explanations = apply_decision_policy(
            risk_score=0.12,
            evidence_quality=0.85,
            signals=signals,
        )
        assert action == DecisionAction.ALLOW
        assert any("acceptable parameters" in exp for exp in explanations)

    def test_medium_risk_triggers_challenge(self) -> None:
        signals = [
            RiskSignalResponse(
                name="retry_frequency",
                severity=SignalSeverity.high,
                value=4,
                contribution=0.35,
                description="Multiple retries",
            )
        ]
        action, explanations = apply_decision_policy(
            risk_score=0.55,
            evidence_quality=0.80,
            signals=signals,
        )
        assert action == DecisionAction.CHALLENGE
        assert any("Step-up authentication" in exp for exp in explanations)

    def test_high_risk_with_strong_evidence_blocks(self) -> None:
        signals = [
            RiskSignalResponse(
                name="cross_merchant_device_reuse",
                severity=SignalSeverity.high,
                value=6,
                contribution=0.45,
                description="Device linked to attack",
            )
        ]
        action, explanations = apply_decision_policy(
            risk_score=0.88,
            evidence_quality=0.90,
            signals=signals,
        )
        assert action == DecisionAction.BLOCK
        assert any("high-confidence evidence chain" in exp for exp in explanations)

    def test_high_risk_with_weak_evidence_routes_to_manual_hold_or_challenge(self) -> None:
        signals = []
        action, explanations = apply_decision_policy(
            risk_score=0.90,
            evidence_quality=0.40,  # weak evidence
            signals=signals,
        )
        assert action == DecisionAction.MANUAL_HOLD
        assert any("telemetry evidence is incomplete" in exp for exp in explanations)
