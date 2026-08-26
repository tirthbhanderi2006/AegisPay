import json
from typing import Any, Dict

from app.agents.llm import invoke_structured
from app.models.outputs import AuditVerdict
from app.utils.masking import mask_record

SYSTEM_PROMPT = """You are a Senior Chargeback Adjudicator employed by a card-issuing bank. Your job is to protect cardholders from unjustified merchant claims. You are structurally biased toward REJECTING weak, incomplete, or non-compliant dossiers — a merchant must earn approval with airtight evidence, not just plausible-sounding narrative.

Review the submitted DOSSIER DRAFT against the RAW TELEMETRY provided. Apply the following checklist rigorously:

1. TIME WINDOW COMPLIANCE — For any CE3.0 claim, do the cited historical transactions actually fall within the 120-365 day window relative to the disputed transaction? Check the math yourself; do not trust the draft's arithmetic.
2. IDENTIFIER MATCHING — Does at least one hard identifier (IP address OR device hash) genuinely match between the disputed transaction and each cited historical transaction? Partial or fuzzy matches do not count.
3. DELIVERY PROOF STRENGTH — If fulfillment is physical shipping, is there a named-recipient signature, not just a carrier "delivered" status? A GPS drop-off alone is weak evidence of cardholder receipt.
4. AUTHENTICATION STRENGTH — Was 3DS/EMV authentication actually completed (ECI flag showing full liability shift), or only attempted?
5. UNSUPPORTED CLAIMS — Flag any sentence in the draft that is not directly traceable to a specific field in the telemetry. Treat unsupported claims as automatic deficiencies.
6. TONE — Flag persuasive or emotional language; adjudicators require evidentiary tone only.

Be specific in your deficiencies. "Weak evidence" is not acceptable feedback — say exactly which claim is weak and why, so the merchant's drafting agent can fix it in one revision cycle.

If the dossier satisfies all six checks with no material gaps, pass it. Do not hold out for a "perfect" dossier — pass anything that would realistically survive bank review.

Output STRICTLY as valid JSON, no markdown fences, no commentary outside the JSON object:

{
  "passed": true or false,
  "confidence_score": float between 0.0 and 1.0,
  "deficiencies": ["specific, actionable gap 1", "specific, actionable gap 2"],
  "suggested_revisions": ["exact fix for deficiency 1", "exact fix for deficiency 2"]
}"""

USER_TEMPLATE = """DOSSIER DRAFT UNDER REVIEW:
{draft_dossier_json}

RAW TELEMETRY (ground truth — cross-check every claim against this):
{telemetry_json_masked}

RULE ENGINE GROUND TRUTH:
- CE3.0 / Scheme Qualified: {ce3_qualified}
- Qualifying Transaction Count: {qualifying_tx_count}

This is audit iteration {current_iteration} of {max_iterations}.

Evaluate the dossier now, following the checklist exactly."""


def _safe_failed_verdict() -> AuditVerdict:
    return AuditVerdict(
        passed=False,
        confidence_score=0.0,
        deficiencies=["Auditor output could not be parsed as valid JSON; treating the dossier as failed."],
        suggested_revisions=["Regenerate the dossier addressing the deterministic rule-engine rejection reasons."],
    )


def run_audit(state: Dict[str, Any]) -> Dict[str, Any]:
    event = state["event"]
    rule_result = state["rule_result"]
    current_iteration = state.get("iterations", 0) + 1
    telemetry_masked = json.dumps(
        mask_record(
            {
                "disputed_transaction": event.telemetry.model_dump(),
                "historical_transactions": [tx.model_dump() for tx in event.historical_transactions],
            }
        ),
        indent=2,
        default=str,
    )
    user_prompt = USER_TEMPLATE.format(
        draft_dossier_json=json.dumps(state.get("dossier"), indent=2),
        telemetry_json_masked=telemetry_masked,
        ce3_qualified=rule_result.get("ce3_qualified"),
        qualifying_tx_count=rule_result.get("qualifying_tx_count"),
        current_iteration=current_iteration,
        max_iterations=state.get("max_iterations", 2),
    )
    verdict = invoke_structured(SYSTEM_PROMPT, user_prompt, AuditVerdict)
    if verdict is None:
        verdict = _safe_failed_verdict()
        llm_failed = True
    else:
        llm_failed = False
    audit_record = verdict.model_dump()
    audit_record["iteration"] = current_iteration
    audit_record["auditor_llm_failed"] = llm_failed
    return {
        "audit": audit_record,
        "audit_history": list(state.get("audit_history", [])) + [audit_record],
        "iterations": current_iteration,
    }
