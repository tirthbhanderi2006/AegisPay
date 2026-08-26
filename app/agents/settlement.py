from typing import Any, Dict

from app.agents.llm import invoke_structured
from app.config import settings
from app.models.outputs import MerchantNotice

SYSTEM_PROMPT = """You are a Merchant Communications Assistant for a payment gateway's risk operations team. When a dispute is automatically settled instead of contested, you write a short, transparent explanation to the merchant so they understand the decision was economically rational, not a system failure.

RULES:
1. State the expected-value calculation in plain terms (win probability, dispute fee, amount at risk) using only the numbers provided — never estimate or round in a way that changes the conclusion.
2. Do not apologize excessively or imply the merchant did anything wrong.
3. Keep it under 120 words.
4. End with one concrete, actionable tip the merchant could use to improve future dispute-eligibility (e.g., enabling 3DS, requiring signature-on-delivery) — but only suggest tips relevant to the actual gap identified in the data.

Output STRICTLY as valid JSON:

{
  "notice_title": "string",
  "notice_body": "string, under 120 words",
  "improvement_tip": "string, one sentence"
}"""

USER_TEMPLATE = """DISPUTE ID: {dispute_id}
AMOUNT: {amount} {currency}
WIN PROBABILITY: {win_probability}
DISPUTE FEE: {dispute_fee}
NET EXPECTED VALUE: {net_expected_value}
PRIMARY GAP IDENTIFIED: {rule_violation_reasons}

Generate the merchant notice now."""


def _safe_notice(state: Dict[str, Any]) -> MerchantNotice:
    return MerchantNotice(
        notice_title=f"Dispute {state['dispute_id']} auto-settled",
        notice_body=(
            f"We settled dispute {state['dispute_id']} ({state['amount']} {state['currency']}) instead of "
            f"contesting it. The modeled win probability was {state['win_probability']:.0%}; with the "
            f"{settings.dispute_fee_usd:.2f} dispute fee applying if the chargeback stands and preparation costs considered, "
            "accepting the chargeback was the lower expected-loss option."
        ),
        improvement_tip=(
            state.get("primary_gap")
            or "Enable 3-D Secure authentication on checkout to strengthen future dispute eligibility."
        ),
    )


def run_auto_settlement_notice(state: Dict[str, Any]) -> Dict[str, Any]:
    rule_result = state["rule_result"]
    ev_settle = state.get("ev_settle", 0.0)
    user_prompt = USER_TEMPLATE.format(
        dispute_id=state["dispute_id"],
        amount=state["event"].amount,
        currency=state["event"].currency,
        win_probability=state.get("win_probability", 0.0),
        dispute_fee=settings.dispute_fee_usd,
        net_expected_value=ev_settle,
        rule_violation_reasons=state.get("primary_gap", "None"),
    )
    notice = invoke_structured(SYSTEM_PROMPT, user_prompt, MerchantNotice)
    if notice is None:
        notice = _safe_notice(
            {
                "dispute_id": state["dispute_id"],
                "amount": state["event"].amount,
                "currency": state["event"].currency,
                "win_probability": state.get("win_probability", 0.0),
                "primary_gap": state.get("primary_gap"),
            }
        )
        llm_failed = True
    else:
        llm_failed = False
    result = notice.model_dump()
    result["notice_llm_failed"] = llm_failed
    return {"notice": result}
