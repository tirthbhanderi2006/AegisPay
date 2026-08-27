"""Repository for FX rates persistence and lookup."""

import logging
import threading
from typing import List, Optional

from app.config import settings
from app.currency.models import CurrencyCode, FXRate
from app.currency.rates import HISTORICAL_FX_RATES

logger = logging.getLogger(__name__)

CREATE_FX_RATES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS fx_rates (
    id SERIAL PRIMARY KEY,
    base_currency VARCHAR(10) NOT NULL,
    quote_currency VARCHAR(10) NOT NULL,
    rate DOUBLE PRECISION NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fx_lookup ON fx_rates (base_currency, quote_currency, effective_at DESC);
"""


class FXRateRepository:
    """PostgreSQL storage + in-memory store for FX rates."""

    def __init__(self, dsn: Optional[str] = None) -> None:
        self._dsn = dsn if dsn is not None else settings.database_url
        self._rates: List[FXRate] = list(HISTORICAL_FX_RATES)
        self._lock = threading.Lock()

    def add_rate(self, rate: FXRate) -> None:
        with self._lock:
            self._rates.append(rate)

    def list_rates(self) -> List[FXRate]:
        with self._lock:
            return list(self._rates)


fx_repo = FXRateRepository()
