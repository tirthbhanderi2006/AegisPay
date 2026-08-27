"""Domain models for Phase 4 multi-currency and temporal FX normalization."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class CurrencyCode(str, Enum):
    USD = "USD"
    INR = "INR"
    EUR = "EUR"
    GBP = "GBP"
    AED = "AED"
    SGD = "SGD"
    AUD = "AUD"
    CAD = "CAD"
    JPY = "JPY"


class FXRate(BaseModel):
    """Timestamped FX rate record with effective time window."""
    base_currency: CurrencyCode = CurrencyCode.USD
    quote_currency: CurrencyCode
    rate: float = Field(..., gt=0.0, description="1 Base = rate Quote")
    effective_at: str = Field(..., description="ISO-8601 timestamp when rate became effective")
    source: str = "ecb_historical_feed"
    version: str = "fx-v1.0"


class AmountNormalizationResult(BaseModel):
    """Result of normalizing an amount to base currency (default USD)."""
    original_amount: float
    original_currency: CurrencyCode
    normalized_amount: float
    target_currency: CurrencyCode = CurrencyCode.USD
    fx_rate_used: float
    fx_rate_version: str
    fx_effective_at: str
    is_stale: bool = False
    evidence_quality_penalty: float = 0.0
    notes: Optional[str] = None
