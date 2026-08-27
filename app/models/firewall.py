"""Phase 2 — Behavioral Intent Firewall domain models.

No ML model or LLM is used in the real-time Intent Firewall.
The firewall prioritizes deterministic, explainable, low-latency
behavioral signals.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class IntentClass(str, Enum):
    NORMAL = "NORMAL"
    CARD_TESTING = "CARD_TESTING"
    AUTOMATED_CHECKOUT = "AUTOMATED_CHECKOUT"
    ACCOUNT_TAKEOVER_LIKE = "ACCOUNT_TAKEOVER_LIKE"
    SUSPICIOUS_VELOCITY = "SUSPICIOUS_VELOCITY"
    UNKNOWN = "UNKNOWN"


class RecommendedAction(str, Enum):
    ALLOW = "ALLOW"
    CHALLENGE = "CHALLENGE"
    BLOCK = "BLOCK"


class SignalSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


# ---------------------------------------------------------------------------
# Risk signal
# ---------------------------------------------------------------------------

class RiskSignal(BaseModel):
    name: str
    value: float
    severity: SignalSeverity
    contribution: float = 0.0
    description: str = ""


# ---------------------------------------------------------------------------
# Behavioral features — typed feature vector
# ---------------------------------------------------------------------------

class BehavioralFeatures(BaseModel):
    """All deterministic features extracted from a session + history.

    Every field has a documented definition, units, and default.
    """
    # --- Velocity (counts) ---
    payment_attempts_last_1m: int = Field(0, description="Payment attempts in the last 60 seconds")
    payment_attempts_last_5m: int = Field(0, description="Payment attempts in the last 300 seconds")
    payment_failures_last_1m: int = Field(0, description="Failed payments in the last 60 seconds")
    payment_failures_last_5m: int = Field(0, description="Failed payments in the last 300 seconds")
    events_per_second: float = Field(0.0, description="Total session events / session duration (Hz)")

    # --- Retry behavior ---
    retry_count: int = Field(0, description="Number of PAYMENT_RETRIED events")
    avg_retry_interval_s: float = Field(0.0, description="Mean seconds between consecutive retries")
    min_retry_interval_s: float = Field(0.0, description="Shortest gap between consecutive retries (seconds)")
    rapid_retry_ratio: float = Field(0.0, description="Fraction of retries with interval < 5 seconds")

    # --- Payment variation ---
    unique_instrument_count: int = Field(0, description="Distinct payment instrument tokens seen")
    amount_variance: float = Field(0.0, description="Variance of payment amounts (USD^2)")
    amount_change_ratio: float = Field(0.0, description="Ratio of distinct amounts to total attempts")

    # --- Identity / infrastructure ---
    accounts_on_device: int = Field(1, description="Distinct account_ids seen on this device_hash")
    devices_on_account: int = Field(1, description="Distinct device_hashes seen on this account_id")
    accounts_on_ip: int = Field(1, description="Distinct account_ids seen on this IP address")
    ips_on_account: int = Field(1, description="Distinct IP addresses seen on this account_id")
    device_change_count: int = Field(0, description="Number of device_hash changes within session")
    ip_change_count: int = Field(0, description="Number of IP address changes within session")

    # --- Session behavior ---
    session_duration_s: float = Field(0.0, description="Seconds from first to last event")
    checkout_to_payment_s: float = Field(0.0, description="Seconds from CHECKOUT_VIEWED to first PAYMENT_ATTEMPTED")
    failed_to_success_ratio: float = Field(0.0, description="PAYMENT_FAILED count / PAYMENT_SUCCEEDED count (inf → 999)")
    event_interval_stddev: float = Field(0.0, description="Standard deviation of inter-event intervals (seconds)")

    # --- Historical (from Phase 1 lifecycle store) ---
    historical_txn_count: int = Field(0, description="Total historical transactions for this account")
    historical_failure_rate: float = Field(0.0, description="Historical PAYMENT_FAILED / total payment events")
    historical_payment_velocity: float = Field(0.0, description="Historical payments per day")
    historical_device_count: int = Field(0, description="Distinct device_hashes in history for this account")
    historical_ip_count: int = Field(0, description="Distinct IP addresses in history for this account")


# ---------------------------------------------------------------------------
# Firewall assessment — the output
# ---------------------------------------------------------------------------

class FirewallAssessment(BaseModel):
    session_id: str
    risk_score: float = 0.0
    intent: IntentClass = IntentClass.UNKNOWN
    action: RecommendedAction = RecommendedAction.ALLOW
    signals: List[RiskSignal] = Field(default_factory=list)
    missing_data: List[str] = Field(default_factory=list)
    features: Optional[BehavioralFeatures] = None
    feature_contributions: Dict[str, float] = Field(default_factory=dict)
    evidence_quality: float = 1.0
    policy_version: str = ""
    engine_version: str = ""
    latency_ms: float = 0.0



# ---------------------------------------------------------------------------
# API request models
# ---------------------------------------------------------------------------

class SessionEvent(BaseModel):
    """A single event within a session evaluation request."""
    model_config = ConfigDict(extra="allow")

    event_id: str
    event_type: str
    timestamp: str  # ISO-8601
    metadata: Dict[str, Any] = Field(default_factory=dict)
    device_hash: Optional[str] = None
    ip_address: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "USD"
    payment_instrument_token: Optional[str] = None
    account_id: Optional[str] = None


class SessionEvaluationRequest(BaseModel):
    """Request body for POST /risk/evaluate-session."""
    model_config = ConfigDict(extra="forbid")

    merchant_id: str
    session_id: str
    events: List[SessionEvent]
    transaction_id: Optional[str] = None
    account_id: Optional[str] = None
    device_hash: Optional[str] = None
    ip_address: Optional[str] = None
