"""Historical FX rates for multi-currency normalization testing and simulation."""

from typing import List
from app.currency.models import CurrencyCode, FXRate

# Pre-populated timeline of historical FX rates (USD as base)
HISTORICAL_FX_RATES: List[FXRate] = [
    # 2026-01-01 Baseline
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.INR, rate=83.20, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.EUR, rate=0.92, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.GBP, rate=0.79, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.AED, rate=3.67, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.SGD, rate=1.34, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.AUD, rate=1.52, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.CAD, rate=1.36, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.JPY, rate=155.0, effective_at="2026-01-01T00:00:00Z", version="fx-2026-01"),

    # 2026-06-01 Mid-year update
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.INR, rate=83.50, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.EUR, rate=0.91, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.GBP, rate=0.78, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.AED, rate=3.67, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.SGD, rate=1.33, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.AUD, rate=1.50, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.CAD, rate=1.35, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.JPY, rate=158.0, effective_at="2026-06-01T00:00:00Z", version="fx-2026-06"),

    # 2026-07-15 Recent update
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.INR, rate=83.80, effective_at="2026-07-15T00:00:00Z", version="fx-2026-07"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.EUR, rate=0.90, effective_at="2026-07-15T00:00:00Z", version="fx-2026-07"),
    FXRate(base_currency=CurrencyCode.USD, quote_currency=CurrencyCode.GBP, rate=0.77, effective_at="2026-07-15T00:00:00Z", version="fx-2026-07"),
]
