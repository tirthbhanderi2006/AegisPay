"""Transaction/event lifecycle domain models for Phase 1.

These models represent the merchant-side longitudinal transaction/event
history.  Every event carries an integrity hash and is free of raw PAN
or sensitive PII.
"""

import hashlib
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EventType(str, Enum):
    """Canonical lifecycle event types."""
    # Phase 1 — lifecycle events
    CHECKOUT_STARTED = "CHECKOUT_STARTED"
    AUTHENTICATION_COMPLETED = "AUTHENTICATION_COMPLETED"
    PAYMENT_AUTHORIZED = "PAYMENT_AUTHORIZED"
    PAYMENT_CAPTURED = "PAYMENT_CAPTURED"
    ORDER_CONFIRMED = "ORDER_CONFIRMED"
    FULFILLMENT_STARTED = "FULFILLMENT_STARTED"
    DELIVERED = "DELIVERED"
    DISPUTE_OPENED = "DISPUTE_OPENED"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    # Phase 2 — behavioral firewall events
    SESSION_STARTED = "SESSION_STARTED"
    CHECKOUT_VIEWED = "CHECKOUT_VIEWED"
    PAYMENT_METHOD_SELECTED = "PAYMENT_METHOD_SELECTED"
    PAYMENT_ATTEMPTED = "PAYMENT_ATTEMPTED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYMENT_SUCCEEDED = "PAYMENT_SUCCEEDED"
    PAYMENT_RETRIED = "PAYMENT_RETRIED"
    SESSION_ENDED = "SESSION_ENDED"


# Canonical ordering used for reconstruction / completeness scoring.
LIFECYCLE_ORDER: List[EventType] = [
    EventType.CHECKOUT_STARTED,
    EventType.AUTHENTICATION_COMPLETED,
    EventType.PAYMENT_AUTHORIZED,
    EventType.PAYMENT_CAPTURED,
    EventType.ORDER_CONFIRMED,
    EventType.FULFILLMENT_STARTED,
    EventType.DELIVERED,
]


# ---------------------------------------------------------------------------
# Integrity helpers
# ---------------------------------------------------------------------------

def _compute_integrity_hash(event_id: str, transaction_id: str, event_type: str, timestamp: str) -> str:
    """SHA-256 of the four canonical identity fields."""
    payload = f"{event_id}|{transaction_id}|{event_type}|{timestamp}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Core models
# ---------------------------------------------------------------------------

class PaymentTransaction(BaseModel):
    """A merchant-side transaction record (no raw PAN)."""
    model_config = ConfigDict(extra="allow")

    transaction_id: str
    merchant_id: str
    amount: Optional[float] = None
    currency: str = "USD"
    ip_address: Optional[str] = None
    device_hash: Optional[str] = None
    card_last4: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PaymentEvent(BaseModel):
    """A single lifecycle event tied to a transaction."""
    model_config = ConfigDict(extra="allow")

    event_id: str
    transaction_id: str
    merchant_id: str
    event_type: EventType
    timestamp: str  # ISO-8601
    source: str = "merchant_api"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    integrity_hash: str = ""

    @model_validator(mode="after")
    def _auto_integrity_hash(self) -> "PaymentEvent":
        if not self.integrity_hash:
            self.integrity_hash = _compute_integrity_hash(
                self.event_id, self.transaction_id,
                self.event_type.value, self.timestamp,
            )
        return self


class EvidenceRecord(BaseModel):
    """A piece of evidence derived from or attached to a transaction event."""
    model_config = ConfigDict(extra="allow")

    evidence_id: str
    transaction_id: str
    merchant_id: str
    event_id: Optional[str] = None
    evidence_type: str
    timestamp: str  # ISO-8601
    source: str = "merchant_api"
    data: Dict[str, Any] = Field(default_factory=dict)
    integrity_hash: str = ""

    @model_validator(mode="after")
    def _auto_integrity_hash(self) -> "EvidenceRecord":
        if not self.integrity_hash:
            self.integrity_hash = _compute_integrity_hash(
                self.evidence_id, self.transaction_id,
                self.evidence_type, self.timestamp,
            )
        return self


# ---------------------------------------------------------------------------
# API request envelope
# ---------------------------------------------------------------------------

class PaymentEventEnvelope(BaseModel):
    """Request body for ``POST /webhooks/payment-event``."""
    model_config = ConfigDict(extra="forbid")

    event_id: str
    transaction_id: str
    merchant_id: str
    event_type: EventType
    timestamp: str
    source: str = "merchant_api"
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Optional transaction-level fields (used to upsert the transaction
    # record if it doesn't exist yet).
    amount: Optional[float] = None
    currency: str = "USD"
    ip_address: Optional[str] = None
    device_hash: Optional[str] = None
    card_last4: Optional[str] = None


# ---------------------------------------------------------------------------
# Reconstruction output
# ---------------------------------------------------------------------------

class TimelineEntry(BaseModel):
    event_id: str
    event_type: str
    timestamp: str
    source: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TransactionReconstruction(BaseModel):
    transaction_id: str
    timeline: List[TimelineEntry] = []
    evidence_present: List[str] = []
    evidence_missing: List[str] = []
    contradictory_events: List[str] = []
    duplicate_events: List[str] = []
    completeness_score: float = 0.0
