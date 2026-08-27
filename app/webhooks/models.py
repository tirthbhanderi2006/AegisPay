"""Outbound webhook models."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class WebhookEventType(str, Enum):
    RISK_DECISION_CREATED = "risk.decision.created"
    RISK_DECISION_UPDATED = "risk.decision.updated"
    RISK_MANUAL_REVIEW_REQUIRED = "risk.manual_review.required"


class WebhookPayload(BaseModel):
    """Clean, privacy-safe outbound webhook payload."""
    event: WebhookEventType
    event_id: str
    transaction_id: str
    merchant_id: str
    decision_id: str
    decision: str
    risk_score: float
    risk_level: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WebhookSubscription(BaseModel):
    subscription_id: str
    merchant_id: str
    webhook_url: str
    webhook_secret: str
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class WebhookDeliveryAttempt(BaseModel):
    delivery_id: str
    subscription_id: str
    event_id: str
    status_code: int
    attempt_number: int
    success: bool
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
