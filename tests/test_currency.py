"""Unit tests for Phase 4 Multi-Currency and Temporal FX Normalization."""

import pytest
from app.currency.models import CurrencyCode, FXRate
from app.currency.converter import CurrencyConverter


class TestCurrencyConversionAndTemporalIntegrity:
    def test_identity_usd_conversion(self):
        conv = CurrencyConverter()
        res = conv.normalize_amount(150.0, "USD", as_of="2026-07-01T10:00:00Z")
        assert res.normalized_amount == 150.0
        assert res.fx_rate_used == 1.0
        assert res.evidence_quality_penalty == 0.0

    def test_inr_normalization_with_temporal_rate(self):
        conv = CurrencyConverter()
        # 8350 INR at 83.5 rate => 100.0 USD
        res = conv.normalize_amount(8350.0, "INR", as_of="2026-06-15T10:00:00Z")
        assert res.normalized_amount == 100.0
        assert res.fx_rate_used == 83.50
        assert res.is_stale is False

    def test_future_rate_exclusion_no_hindsight_leakage(self):
        conv = CurrencyConverter()
        # Rate on 2026-07-15 is 83.80, but at 2026-05-01 only 2026-01-01 rate (83.20) is effective
        res_early = conv.normalize_amount(8320.0, "INR", as_of="2026-05-01T10:00:00Z")
        assert res_early.fx_rate_used == 83.20

        # At 2026-07-20, the 2026-07-15 rate (83.80) is used
        res_late = conv.normalize_amount(8380.0, "INR", as_of="2026-07-20T10:00:00Z")
        assert res_late.fx_rate_used == 83.80

    def test_stale_rate_penalty_attenuation(self):
        conv = CurrencyConverter()
        # Date is 2026-12-01 (more than 30 days after last rate update on 2026-07-15)
        res = conv.normalize_amount(100.0, "EUR", as_of="2026-12-01T10:00:00Z")
        assert res.is_stale is True
        assert res.evidence_quality_penalty > 0.0

    def test_unsupported_currency_fallback(self):
        conv = CurrencyConverter()
        res = conv.normalize_amount(100.0, "XYZ", as_of="2026-07-01T10:00:00Z")
        assert res.fx_rate_version.startswith("fallback")
        assert res.evidence_quality_penalty >= 0.20
