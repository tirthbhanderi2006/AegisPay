"""Action policy — single module for ALLOW / CHALLENGE / BLOCK decisions.

Thresholds are env-overridable:
  AEGIS_FIREWALL_LOW_THRESHOLD  (default 0.3)
  AEGIS_FIREWALL_HIGH_THRESHOLD (default 0.7)

Rationale:
  LOW_THRESHOLD=0.3  -- Below this, behavior is within normal ranges
  HIGH_THRESHOLD=0.7 -- At/above this, behavior is strongly suspicious
  Between: uncertain -> present a CHALLENGE

UNKNOWN intent always maps to ALLOW (insufficient data -> don't block).
"""

import os

from app.models.firewall import IntentClass, RecommendedAction

POLICY_VERSION = "2.0.0"

_LOW_THRESHOLD = float(os.getenv("AEGIS_FIREWALL_LOW_THRESHOLD", "0.3"))
_HIGH_THRESHOLD = float(os.getenv("AEGIS_FIREWALL_HIGH_THRESHOLD", "0.7"))


def get_thresholds():
    return _LOW_THRESHOLD, _HIGH_THRESHOLD


def decide_action(risk_score: float, intent: IntentClass) -> RecommendedAction:
    """Map risk score + intent to a recommended action.

    UNKNOWN intent always -> ALLOW (insufficient data, don't block).
    """
    if intent == IntentClass.UNKNOWN:
        return RecommendedAction.ALLOW
    if risk_score >= _HIGH_THRESHOLD:
        return RecommendedAction.BLOCK
    if risk_score >= _LOW_THRESHOLD:
        return RecommendedAction.CHALLENGE
    return RecommendedAction.ALLOW
