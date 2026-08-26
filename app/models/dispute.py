from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class Network(str, Enum):
    VISA = "VISA"
    MASTERCARD = "MASTERCARD"
    NPCI = "NPCI"
    UNKNOWN = "UNKNOWN"


class ClaimType(str, Enum):
    FRAUD_UNRECOGNIZED = "FRAUD_UNRECOGNIZED"
    PRODUCT_NOT_RECEIVED = "PRODUCT_NOT_RECEIVED"
    DUPLICATE_CHARGE = "DUPLICATE_CHARGE"
    SERVICE_NOT_AS_DESCRIBED = "SERVICE_NOT_AS_DESCRIBED"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    UNKNOWN_REQUIRES_HUMAN_REVIEW = "UNKNOWN_REQUIRES_HUMAN_REVIEW"


class TransactionTelemetry(BaseModel):
    model_config = ConfigDict(extra="allow")

    transaction_id: Optional[str] = None
    timestamp: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "USD"
    ip_address: Optional[str] = None
    device_hash: Optional[str] = None
    card_last4: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    order_id: Optional[str] = None
    fulfillment_type: Optional[str] = None
    three_ds_eci: Optional[str] = None
    three_ds_status: Optional[str] = None
    shipping_carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    delivered_at: Optional[str] = None
    signature_name: Optional[str] = None


class DisputeEvent(BaseModel):
    model_config = ConfigDict(extra="allow")

    dispute_id: str
    network: Network
    reason_code: str
    reason_code_description: Optional[str] = None
    amount: float
    currency: str = "USD"
    disputed_transaction_id: str
    telemetry: TransactionTelemetry
    historical_transactions: List[TransactionTelemetry] = []

    @field_validator("network", mode="before")
    @classmethod
    def _normalize_network(cls, value):
        if isinstance(value, str):
            token = value.strip().upper()
            if token == "RUPAY":
                return Network.NPCI.value
            if token in ("MASTER_CARD", "MASTERCARD", "MC"):
                return Network.MASTERCARD.value
        return value

    @field_validator("reason_code")
    @classmethod
    def _clean_reason_code(cls, value: str) -> str:
        return value.strip()
