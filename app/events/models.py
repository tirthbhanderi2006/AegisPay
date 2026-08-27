"""Merchant lifecycle event models."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class IntegrationEventType(str, Enum):
    TRANSACTION_CREATED = "transaction.created"
    TRANSACTION_AUTHORIZED = "transaction.authorized"
    TRANSACTION_FAILED = "transaction.failed"
    TRANSACTION_COMPLETED = "transaction.completed"
    TRANSACTION_REFUNDED = "transaction.refunded"
    TRANSACTION_DISPUTED = "transaction.disputed"


class IntegrationEventPayload(BaseModel):
    """External payment lifecycle event received from merchant."""
    event_id: str
    event_type: IntegrationEventType
    transaction_id: str
    merchant_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    amount: Optional[float] = None
    currency: Optional[str] = "USD"
    account_token: Optional[str] = None
    device_token: Optional[str] = None
    ip_token: Optional[str] = None
    payment_instrument_token: Optional[str] = None
    failure_reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
