from typing import Tuple

from app.models.dispute import ClaimType
from app.models.engine import RuleEngineResult

BASE_WIN_PROBABILITY = {
    ClaimType.FRAUD_UNRECOGNIZED: 0.35,
    ClaimType.PRODUCT_NOT_RECEIVED: 0.30,
    ClaimType.DUPLICATE_CHARGE: 0.55,
    ClaimType.SERVICE_NOT_AS_DESCRIBED: 0.30,
    ClaimType.PROCESSING_ERROR: 0.45,
    ClaimType.UNKNOWN_REQUIRES_HUMAN_REVIEW: 0.25,
}

MIN_WIN_PROBABILITY = 0.02
MAX_WIN_PROBABILITY = 0.95

CE3_QUALIFIED_BONUS = 0.35
IDENTIFIER_MATCH_ONLY_BONUS = 0.05
THREE_DS_COMPLETED_BONUS = 0.15
THREE_DS_ATTEMPTED_PENALTY = -0.03
NAMED_SIGNATURE_BONUS = 0.08
PHYSICAL_PROOF_BONUS = 0.03


def compute_win_probability(claim_type: ClaimType, rule_result: RuleEngineResult) -> float:
    probability = BASE_WIN_PROBABILITY.get(claim_type, 0.25)
    if rule_result.ce3_qualified:
        probability += CE3_QUALIFIED_BONUS
    elif rule_result.evidence_flags.identifier_match_with_history:
        probability += IDENTIFIER_MATCH_ONLY_BONUS
    if rule_result.evidence_flags.three_ds_completed:
        probability += THREE_DS_COMPLETED_BONUS
    elif rule_result.evidence_flags.three_ds_attempted_only:
        probability += THREE_DS_ATTEMPTED_PENALTY
    if rule_result.evidence_flags.named_recipient_signature:
        probability += NAMED_SIGNATURE_BONUS
    if rule_result.evidence_flags.physical_delivery_proof:
        probability += PHYSICAL_PROOF_BONUS
    probability = max(MIN_WIN_PROBABILITY, min(MAX_WIN_PROBABILITY, probability))
    return round(probability, 4)


def compute_expected_values(
    amount: float,
    win_probability: float,
    dispute_fee_usd: float,
    cost_to_fight_usd: float,
) -> Tuple[float, float]:
    ev_fight = (
        win_probability * amount
        - (1 - win_probability) * (amount + dispute_fee_usd)
        - cost_to_fight_usd
    )
    ev_settle = -amount
    return round(ev_fight, 2), round(ev_settle, 2)


def decide_route(
    needs_human_review: bool,
    ev_fight: float,
    ev_settle: float,
) -> str:
    if needs_human_review:
        return "escalate"
    if ev_fight > ev_settle:
        return "fight"
    return "settle"
