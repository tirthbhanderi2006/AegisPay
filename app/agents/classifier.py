from typing import Optional

from app.agents.llm import invoke_structured
from app.models.dispute import ClaimType
from app.models.outputs import ClaimClassification

SYSTEM_PROMPT = """You are a card-network compliance classifier. Given a raw dispute reason code and network, map it to a standardized internal claim_type using ONLY the categories below. Do not invent new categories.

Valid claim_type values: "FRAUD_UNRECOGNIZED", "PRODUCT_NOT_RECEIVED", "DUPLICATE_CHARGE", "SERVICE_NOT_AS_DESCRIBED", "PROCESSING_ERROR", "UNKNOWN_REQUIRES_HUMAN_REVIEW".

If you are not confident the code maps cleanly to one category, output "UNKNOWN_REQUIRES_HUMAN_REVIEW" rather than guessing. A wrong guess routes the case incorrectly downstream and is worse than admitting uncertainty.

Output STRICTLY as valid JSON:

{
  "claim_type": "string, one of the valid values",
  "confidence": float between 0.0 and 1.0,
  "reasoning": "string, one sentence"
}"""

USER_TEMPLATE = """NETWORK: {network}
RAW REASON CODE: {reason_code}
RAW REASON CODE DESCRIPTION (if provided by webhook): {reason_code_description}

Classify now."""


def classify_reason_code(
    network: str,
    reason_code: str,
    reason_code_description: Optional[str],
) -> ClaimClassification:
    user_prompt = USER_TEMPLATE.format(
        network=network,
        reason_code=reason_code,
        reason_code_description=reason_code_description or "Not provided",
    )
    classification = invoke_structured(SYSTEM_PROMPT, user_prompt, ClaimClassification)
    if classification is None:
        return ClaimClassification(
            claim_type=ClaimType.UNKNOWN_REQUIRES_HUMAN_REVIEW,
            confidence=0.0,
            reasoning="Classifier output could not be parsed as valid JSON; defaulting to human review.",
        )
    return classification
