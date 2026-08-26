import json
from typing import Any, Dict

from app.agents.llm import invoke_structured
from app.models.outputs import DossierDraft
from app.utils.masking import mask_record

SYSTEM_PROMPT = """You are the Lead Financial Dispute Officer for an enterprise payment gateway, acting on behalf of a merchant contesting a chargeback.

Your sole objective is to produce an airtight, legally structured arbitration dossier that will be reviewed by an issuing bank's dispute adjudicator.

HARD RULES — violating any of these makes your output unusable:
1. You may ONLY reference facts, timestamps, identifiers, and log values that appear in the TELEMETRY DATA block below. If a fact is not present in that block, you must NOT state it, imply it, or estimate it.
2. Never invent transaction IDs, IP addresses, device hashes, dates, or amounts. If a required field is missing or null, explicitly write "Not available" in that evidence point rather than guessing.
3. Map every claim you make to a specific compliance rule (Visa Compelling Evidence 3.0, Mastercard Reason Code definitions, or NPCI UDIR clauses) — never assert something is "sufficient evidence" without citing which rule it satisfies.
4. Write in a formal, neutral, evidentiary tone. No persuasive language, no emotional appeals, no adjectives like "clearly" or "obviously" — adjudicators discount rhetoric and reward verifiable fact chains.
5. If you are given PRIOR AUDITOR FEEDBACK, you must resolve every listed deficiency in this revision. Do not resubmit an unchanged claim that was already flagged.
6. If the qualifying evidence is genuinely weak (e.g., CE3.0 not qualified), do not overstate confidence — reflect that honestly in compelling_evidence_type and rebuttal_narrative. A weak dossier submitted honestly is more useful than a strong-sounding one that gets rejected for overreach.

Output STRICTLY as valid JSON matching this schema, with no markdown fences, no preamble, no commentary outside the JSON object:

{
  "executive_summary": "string, 2-4 sentences",
  "dispute_classification": "string, e.g. 'Visa CE3.0 Qualified — Card-Absent Fraud Claim'",
  "compelling_evidence_type": "string, name the exact rule/category satisfied or 'Insufficient — Standard Rebuttal Only'",
  "evidence_points": [
    {
      "category": "string, e.g. 'Cardholder Authentication'",
      "claim": "string, factual statement only",
      "source_metric": "string, exact field/value from telemetry this claim is drawn from",
      "rule_mapping": "string, the specific network rule this evidence satisfies"
    }
  ],
  "rebuttal_narrative": "string, full formal rebuttal letter body, 200-400 words"
}"""

USER_TEMPLATE = """DISPUTE DETAILS:
- Dispute ID: {dispute_id}
- Network: {network}
- Reason Code: {reason_code}
- Amount: {amount} {currency}
- Claim Type: {claim_type}

DETERMINISTIC RULE ENGINE RESULT (already computed, do not re-derive):
- CE3.0 / Scheme Qualified: {ce3_qualified}
- Qualifying Transaction Count: {qualifying_tx_count}
- Rejection Reasons (if any): {rule_violation_reasons}

TELEMETRY DATA:
{telemetry_json_masked}

QUALIFYING HISTORICAL TRANSACTIONS:
{qualifying_transactions_json}

PRIOR AUDITOR FEEDBACK (if this is a revision, otherwise "None — first draft"):
{auditor_critique_json_or_none}

Generate the dossier draft now, following the schema exactly."""


def _safe_draft() -> DossierDraft:
    return DossierDraft(
        executive_summary=(
            "The drafting model could not produce a structured dossier for this dispute. "
            "This submission reflects only data available in the deterministic record."
        ),
        dispute_classification="Insufficient — Standard Rebuttal Only",
        compelling_evidence_type="Insufficient — Standard Rebuttal Only",
        evidence_points=[],
        rebuttal_narrative=(
            "A structured dossier could not be generated from the available telemetry. "
            "No evidence points are asserted."
        ),
    )


def run_draft(state: Dict[str, Any]) -> Dict[str, Any]:
    event = state["event"]
    rule_result = state["rule_result"]
    audit = state.get("audit")
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
    qualifying_txs = rule_result.get("qualifying_transactions", [])
    user_prompt = USER_TEMPLATE.format(
        dispute_id=event.dispute_id,
        network=event.network.value,
        reason_code=event.reason_code,
        amount=event.amount,
        currency=event.currency,
        claim_type=state.get("claim_type") or "UNKNOWN_REQUIRES_HUMAN_REVIEW",
        ce3_qualified=rule_result.get("ce3_qualified"),
        qualifying_tx_count=rule_result.get("qualifying_tx_count"),
        rule_violation_reasons="; ".join(rule_result.get("rejection_reasons", [])) or "None",
        telemetry_json_masked=telemetry_masked,
        qualifying_transactions_json=json.dumps(qualifying_txs, indent=2) if qualifying_txs else "None",
        auditor_critique_json_or_none=json.dumps(audit, indent=2) if audit else "None — first draft",
    )
    draft = invoke_structured(SYSTEM_PROMPT, user_prompt, DossierDraft)
    if draft is None:
        return {"dossier": _safe_draft().model_dump(), "draft_llm_failed": True}
    return {"dossier": draft.model_dump(), "draft_llm_failed": False}
