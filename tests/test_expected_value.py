from app.engine.expected_value import (
    MAX_WIN_PROBABILITY,
    MIN_WIN_PROBABILITY,
    compute_expected_values,
    compute_win_probability,
    decide_route,
)
from app.models.dispute import ClaimType
from app.models.engine import EvidenceFlags, RuleEngineResult


def _flags(**kwargs) -> EvidenceFlags:
    return EvidenceFlags(**kwargs)


def test_weak_fraud_scenario_probability_and_route_settles():
    rule = RuleEngineResult(
        ce3_applicable=True,
        ce3_qualified=False,
        qualifying_tx_count=0,
        evidence_flags=_flags(three_ds_attempted_only=True),
    )
    p = compute_win_probability(ClaimType.FRAUD_UNRECOGNIZED, rule)
    assert p == 0.32
    ev_fight, ev_settle = compute_expected_values(79.99, p, dispute_fee_usd=15.0, cost_to_fight_usd=50.0)
    assert decide_route(False, ev_fight, ev_settle) == "settle"


def test_strong_ce3_scenario_routes_to_fight():
    rule = RuleEngineResult(
        ce3_applicable=True,
        ce3_qualified=True,
        qualifying_tx_count=2,
        evidence_flags=_flags(
            three_ds_completed=True,
            named_recipient_signature=True,
            physical_delivery_proof=True,
            identifier_match_with_history=True,
        ),
    )
    p = compute_win_probability(ClaimType.FRAUD_UNRECOGNIZED, rule)
    assert p == MAX_WIN_PROBABILITY
    ev_fight, ev_settle = compute_expected_values(495.0, p, dispute_fee_usd=15.0, cost_to_fight_usd=50.0)
    assert decide_route(False, ev_fight, ev_settle) == "fight"


def test_win_probability_clamped_to_bounds():
    maxed = RuleEngineResult(
        ce3_applicable=True,
        ce3_qualified=True,
        qualifying_tx_count=5,
        evidence_flags=_flags(
            three_ds_completed=True,
            named_recipient_signature=True,
            physical_delivery_proof=True,
            identifier_match_with_history=True,
        ),
    )
    assert compute_win_probability(ClaimType.DUPLICATE_CHARGE, maxed) == MAX_WIN_PROBABILITY

    floored = RuleEngineResult(
        ce3_applicable=False,
        ce3_qualified=False,
        qualifying_tx_count=0,
        evidence_flags=_flags(),
    )
    assert compute_win_probability(ClaimType.UNKNOWN_REQUIRES_HUMAN_REVIEW, floored) >= MIN_WIN_PROBABILITY


def test_ev_monotonic_in_win_probability():
    low = compute_expected_values(300.0, 0.30, 15.0, 50.0)[0]
    high = compute_expected_values(300.0, 0.90, 15.0, 50.0)[0]
    assert high > low


def test_human_review_overrides_economics():
    assert decide_route(True, 1000.0, -100.0) == "escalate"
