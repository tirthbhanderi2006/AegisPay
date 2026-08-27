"""Temporal multi-currency converter enforcing zero hindsight leakage."""

from datetime import datetime, timedelta, timezone
import logging
from typing import Dict, List, Optional

from app.currency.models import AmountNormalizationResult, CurrencyCode, FXRate
from app.currency.rates import HISTORICAL_FX_RATES
from app.utils.timeutil import parse_iso8601

logger = logging.getLogger(__name__)


# Default fallback rates if database is empty or rate is unavailable
FALLBACK_USD_RATES: Dict[CurrencyCode, float] = {
    CurrencyCode.USD: 1.0,
    CurrencyCode.INR: 83.0,
    CurrencyCode.EUR: 0.92,
    CurrencyCode.GBP: 0.79,
    CurrencyCode.AED: 3.67,
    CurrencyCode.SGD: 1.34,
    CurrencyCode.AUD: 1.50,
    CurrencyCode.CAD: 1.35,
    CurrencyCode.JPY: 155.0,
}


class CurrencyConverter:
    """Temporal multi-currency normalization engine."""

    def __init__(
        self,
        rates: Optional[List[FXRate]] = None,
        max_staleness_days: int = 30,
    ) -> None:
        self._rates: List[FXRate] = rates if rates is not None else list(HISTORICAL_FX_RATES)
        self.max_staleness_days: int = max_staleness_days

    def add_rate(self, rate: FXRate) -> None:
        self._rates.append(rate)

    def get_effective_rate(
        self,
        quote_currency: CurrencyCode,
        base_currency: CurrencyCode = CurrencyCode.USD,
        as_of: Optional[str] = None,
    ) -> Optional[FXRate]:
        """Find latest FX rate where effective_at <= as_of (zero hindsight leakage)."""
        if quote_currency == base_currency:
            return FXRate(
                base_currency=base_currency,
                quote_currency=quote_currency,
                rate=1.0,
                effective_at=as_of or "1970-01-01T00:00:00Z",
                version="fx-identity",
            )

        t_as_of = parse_iso8601(as_of) if as_of else datetime.now(timezone.utc)
        if t_as_of is None:
            t_as_of = datetime.now(timezone.utc)

        valid_rates: List[FXRate] = []
        for r in self._rates:
            if r.base_currency == base_currency and r.quote_currency == quote_currency:
                r_eff = parse_iso8601(r.effective_at)
                if r_eff and r_eff <= t_as_of:
                    valid_rates.append(r)

        if not valid_rates:
            return None

        # Sort descending by effective_at timestamp to get most recent effective rate
        valid_rates.sort(key=lambda x: parse_iso8601(x.effective_at) or datetime.min, reverse=True)
        return valid_rates[0]

    def normalize_amount(
        self,
        amount: float,
        currency: str,
        target_currency: CurrencyCode = CurrencyCode.USD,
        as_of: Optional[str] = None,
    ) -> AmountNormalizationResult:
        """Normalize amount to target currency (default USD) with temporal guarantees."""
        try:
            curr_enum = CurrencyCode(currency.upper())
        except ValueError:
            logger.warning("Unsupported currency code: %s. Falling back to USD 1:1 with penalty.", currency)
            return AmountNormalizationResult(
                original_amount=amount,
                original_currency=CurrencyCode.USD,
                normalized_amount=amount,
                target_currency=target_currency,
                fx_rate_used=1.0,
                fx_rate_version="fallback_unsupported",
                fx_effective_at=as_of or "1970-01-01T00:00:00Z",
                is_stale=True,
                evidence_quality_penalty=0.30,
                notes=f"Unknown currency '{currency}', fallback applied.",
            )

        if curr_enum == target_currency:
            return AmountNormalizationResult(
                original_amount=amount,
                original_currency=curr_enum,
                normalized_amount=round(amount, 2),
                target_currency=target_currency,
                fx_rate_used=1.0,
                fx_rate_version="identity",
                fx_effective_at=as_of or "1970-01-01T00:00:00Z",
                is_stale=False,
                evidence_quality_penalty=0.0,
            )

        rate_record = self.get_effective_rate(quote_currency=curr_enum, base_currency=target_currency, as_of=as_of)
        t_as_of = parse_iso8601(as_of) if as_of else datetime.now(timezone.utc)

        if not rate_record:
            # Fallback safe default
            fb_rate = FALLBACK_USD_RATES.get(curr_enum, 1.0)
            norm = round(amount / fb_rate, 2)
            return AmountNormalizationResult(
                original_amount=amount,
                original_currency=curr_enum,
                normalized_amount=norm,
                target_currency=target_currency,
                fx_rate_used=fb_rate,
                fx_rate_version="fallback_static",
                fx_effective_at="1970-01-01T00:00:00Z",
                is_stale=True,
                evidence_quality_penalty=0.20,
                notes="No historical FX rate before transaction timestamp; static fallback used.",
            )

        # Check staleness: if rate effective_at is > max_staleness_days prior to as_of
        r_eff = parse_iso8601(rate_record.effective_at)
        is_stale = False
        penalty = 0.0
        if r_eff and t_as_of and (t_as_of - r_eff) > timedelta(days=self.max_staleness_days):
            is_stale = True
            penalty = 0.10

        normalized = round(amount / rate_record.rate, 2)
        return AmountNormalizationResult(
            original_amount=amount,
            original_currency=curr_enum,
            normalized_amount=normalized,
            target_currency=target_currency,
            fx_rate_used=rate_record.rate,
            fx_rate_version=rate_record.version,
            fx_effective_at=rate_record.effective_at,
            is_stale=is_stale,
            evidence_quality_penalty=penalty,
        )


# Global singleton instance
currency_converter = CurrencyConverter()
