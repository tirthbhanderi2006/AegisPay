"""Decision policy and deterministic explanation generation."""

from typing import List, Optional, Tuple
from app.decision.models import DecisionAction, RiskLevel, RiskSignalResponse
from app.models.firewall import SignalSeverity


POLICY_VERSION = "policy-v2.0"


def determine_risk_level(risk_score: float) -> RiskLevel:
    """Classify continuous risk score into categorical risk levels."""
    if risk_score >= 0.70:
        return RiskLevel.HIGH
    if risk_score >= 0.30:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def apply_decision_policy(
    risk_score: float,
    evidence_quality: float,
    signals: List[RiskSignalResponse],
    low_threshold: float = 0.30,
    high_threshold: float = 0.70,
    eq_threshold: float = 0.70,
    is_graph_degraded: bool = False,
) -> Tuple[DecisionAction, List[str]]:
    """Determine final decision action and deterministic template explanations.

    Conservative Policy:
    - LOW + sufficient evidence -> ALLOW
    - MEDIUM -> CHALLENGE
    - HIGH + strong evidence -> BLOCK
    - HIGH + weak evidence -> CHALLENGE or MANUAL_HOLD
    """
    reasons: List[str] = []

    # Map Action
    if risk_score >= high_threshold:
        if evidence_quality >= eq_threshold:
            action = DecisionAction.BLOCK
            reasons.append("High risk indicators detected with high-confidence evidence chain.")
        else:
            # Conservative hold/challenge on weak evidence
            action = DecisionAction.CHALLENGE if risk_score < 0.85 else DecisionAction.MANUAL_HOLD
            reasons.append("Elevated risk detected, but telemetry evidence is incomplete. Routing to step-up verification.")
    elif risk_score >= low_threshold:
        action = DecisionAction.CHALLENGE
        reasons.append("Moderate behavioral deviation observed. Step-up authentication required.")
    else:
        action = DecisionAction.ALLOW
        reasons.append("Behavioral patterns and entity history are within normal acceptable parameters.")

    # Signal-specific deterministic explanations (Zero LLM, Zero PII leakage)
    for s in signals:
        if s.severity in [SignalSeverity.high, "high", "HIGH"]:
            if "cross_merchant" in s.name:
                reasons.append("Associated device or network was previously linked to high-velocity failure activity across network contexts.")
            elif "velocity" in s.name:
                reasons.append("Rapid payment attempt frequency observed exceeding normal human baseline.")
            elif "retry" in s.name:
                reasons.append("Multiple rapid retries with sequential failures detected.")
            elif "instrument" in s.name or "variation" in s.name:
                reasons.append("Multiple distinct payment cards or varying amounts attempted within session.")
            elif "device" in s.name or "infrastructure" in s.name:
                reasons.append("Device identifier cycling or multi-account rotation detected.")

    if is_graph_degraded:
        reasons.append("Cross-merchant network intelligence service was temporarily unavailable; decision based on local behavioral features.")

    return action, reasons
