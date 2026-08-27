"""AegisPay Phase 4 Multi-Currency and Temporal FX Package."""

from app.currency.models import (
    CurrencyCode,
    FXRate,
    AmountNormalizationResult,
)
from app.currency.rates import HISTORICAL_FX_RATES
from app.currency.converter import (
    CurrencyConverter,
    currency_converter,
    FALLBACK_USD_RATES,
)
from app.currency.repository import (
    FXRateRepository,
    fx_repo,
    CREATE_FX_RATES_TABLE_SQL,
)

__all__ = [
    "CurrencyCode",
    "FXRate",
    "AmountNormalizationResult",
    "HISTORICAL_FX_RATES",
    "CurrencyConverter",
    "currency_converter",
    "FALLBACK_USD_RATES",
    "FXRateRepository",
    "fx_repo",
    "CREATE_FX_RATES_TABLE_SQL",
]
