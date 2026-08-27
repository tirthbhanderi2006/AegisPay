import json
import logging
from typing import Any, Dict

from langgraph.graph import END, START, StateGraph

from app.agents.auditor import run_audit
from app.agents.classifier import classify_reason_code
from app.agents.drafter import run_draft
from app.agents.settlement import run_auto_settlement_notice
from app.config import settings
from app.engine.ce3_rules import evaluate_rule_engine
from app.engine.expected_value import (
    compute_expected_values,
    compute_win_probability,
    decide_route,
)
from app.engine.reason_codes import lookup
from app.graph.state import AegisState
from app.models.dispute import ClaimType, DisputeEvent

logger = logging.getLogger(__name__)

FINAL_FOUGHT = "DISPUTE_CONTESTED_DOSSIER_FINALIZED"
FINAL_SETTLED = "AUTO_SETTLED_MERCHANT_NOTIFIED"
FINAL_ESCALATED_HUMAN = "ESCALATED_REQUIRES_HUMAN_REVIEW"
FINAL_ESCALATED_ITERATIONS = "ESCALATED_MAX_AUDIT_ITERATIONS"

DEFAULT_GAP_BY_CLAIM = {
    ClaimType.FRAUD_UNRECOGNIZED: "No qualifying CE3.0 evidence chain (2+ matching historical transactions within the 120-365 day window).",
    ClaimType.PRODUCT_NOT_RECEIVED: "No named-recipient delivery signature or carrier proof of receipt.",
    ClaimType.DUPLICATE_CHARGE: "No transaction-level deduplication proof or matching authorization records.",
    ClaimType.SERVICE_NOT_AS_DESCRIBED: "No service-terms acceptance or usage logs tying the cardholder to the service.",
    ClaimType.PROCESSING_ERROR: "No reconciliation records demonstrating a processing correction.",
}


def build_initial_state(event: DisputeEvent) -> AegisState:
    return AegisState(
        event=event,
        dispute_id=event.dispute_id,
        network=event.network.value,
        reason_code=event.reason_code,
        reason_code_description=event.reason_code_description,
        amount=event.amount,
        currency=event.currency,
        claim_type=None,
        classification_source="static_table",
        classifier_confidence=1.0,
        needs_human_review=False,
        rule_result={},
        primary_gap="",
        win_probability=0.0,
        ev_fight=0.0,
        ev_settle=0.0,
        decision="pending",
        dossier=None,
        draft_llm_failed=False,
        audit=None,
        audit_history=[],
        iterations=0,
        max_iterations=settings.max_audit_iterations,
        notice=None,
        final_status="PENDING",
        errors=[],
        # Phase 1 — lifecycle enrichment (populated by enrich_from_lifecycle node)
        transaction_timeline=None,
        evidence_records=None,
        evidence_missing=None,
        evidence_conflicts=None,
        evidence_completeness=None,
        # Phase 2 — firewall assessment context
        firewall_assessments=None,
    )


def enrich_from_lifecycle_node(state: AegisState) -> Dict[str, Any]:
    """If the disputed transaction has stored lifecycle data, enrich the state.

    If the transaction is not in the lifecycle store, returns an empty dict
    and the pipeline continues with existing behavior exactly.
    """
    event = state["event"]
    txn_id = event.disputed_transaction_id
    reconstruction = None
    try:
        from app.engine.reconstruction import reconstruct_transaction
        reconstruction = reconstruct_transaction(txn_id)
    except Exception as exc:
        logger.warning("Lifecycle enrichment failed for %s: %s", txn_id, exc)

    assessments: List[Dict[str, Any]] = []
    try:
        from app.lifecycle_repo import lifecycle_repository
        raw_assessments = lifecycle_repository.get_assessments_for_transaction(txn_id)
        if raw_assessments:
            assessments = [dict(a) for a in raw_assessments]
    except Exception as exc:
        logger.warning("Failed to fetch firewall assessments for %s: %s", txn_id, exc)

    if reconstruction is None and not assessments:
        return {}

    enrichment: Dict[str, Any] = {}
    if reconstruction is not None:
        enrichment.update({
            "transaction_timeline": [entry.model_dump() for entry in reconstruction.timeline],
            "evidence_records": [],
            "evidence_missing": reconstruction.evidence_missing,
            "evidence_conflicts": reconstruction.contradictory_events,
            "evidence_completeness": reconstruction.completeness_score,
        })
    if assessments:
        enrichment["firewall_assessments"] = assessments

    return enrichment



def parse_dispute_node(state: AegisState) -> Dict[str, Any]:
    event = state["event"]
    claim_type = lookup(event.network, event.reason_code)
    if claim_type is not None:
        return {
            "claim_type": claim_type.value,
            "classification_source": "static_table",
            "classifier_confidence": 1.0,
            "needs_human_review": False,
        }
    classification = classify_reason_code(
        network=event.network.value,
        reason_code=event.reason_code,
        reason_code_description=event.reason_code_description,
    )
    needs_review = (
        classification.claim_type == ClaimType.UNKNOWN_REQUIRES_HUMAN_REVIEW
        or classification.confidence < 0.4
    )
    return {
        "claim_type": classification.claim_type.value,
        "classification_source": "llm_fallback",
        "classifier_confidence": classification.confidence,
        "needs_human_review": needs_review,
    }


def evaluate_rules_node(state: AegisState) -> Dict[str, Any]:
    event = state["event"]
    claim_type = ClaimType(state["claim_type"])
    rule_result = evaluate_rule_engine(event, claim_type)
    return {"rule_result": rule_result.model_dump()}


def route_decision_node(state: AegisState) -> Dict[str, Any]:
    event = state["event"]
    rule_result_model = _rule_result_from_state(state)
    claim_type = ClaimType(state["claim_type"])
    win_probability = compute_win_probability(claim_type, rule_result_model)
    ev_fight, ev_settle = compute_expected_values(
        amount=event.amount,
        win_probability=win_probability,
        dispute_fee_usd=settings.dispute_fee_usd,
        cost_to_fight_usd=settings.cost_to_fight_usd,
    )
    decision = decide_route(
        needs_human_review=state.get("needs_human_review", False),
        ev_fight=ev_fight,
        ev_settle=ev_settle,
    )
    reasons = rule_result_model.rejection_reasons or []
    if reasons:
        primary_gap = "; ".join(reasons)
    elif rule_result_model.ce3_qualified:
        primary_gap = "None — CE3.0 qualifying evidence chain satisfied."
    else:
        primary_gap = DEFAULT_GAP_BY_CLAIM.get(
            claim_type, "Insufficient supporting evidence in telemetry."
        )
    return {
        "win_probability": win_probability,
        "ev_fight": ev_fight,
        "ev_settle": ev_settle,
        "decision": decision,
        "primary_gap": primary_gap,
    }


def draft_dossier_node(state: AegisState) -> Dict[str, Any]:
    return dict(run_draft(state))


def audit_dossier_node(state: AegisState) -> Dict[str, Any]:
    return dict(run_audit(state))


def auto_settlement_notice_node(state: AegisState) -> Dict[str, Any]:
    return dict(run_auto_settlement_notice(state))


def finalize_fought_node(state: AegisState) -> Dict[str, Any]:
    return {"final_status": FINAL_FOUGHT}


def finalize_settled_node(state: AegisState) -> Dict[str, Any]:
    return {"final_status": FINAL_SETTLED}


def finalize_escalated_node(state: AegisState) -> Dict[str, Any]:
    exhausted = (
        state.get("iterations", 0) >= state.get("max_iterations", settings.max_audit_iterations)
        and bool(state.get("audit_history"))
    )
    status = FINAL_ESCALATED_ITERATIONS if exhausted else FINAL_ESCALATED_HUMAN
    return {"final_status": status}


def route_after_route_decision(state: AegisState) -> str:
    return state.get("decision", "escalate")


def route_after_audit(state: AegisState) -> str:
    audit = state.get("audit") or {}
    if audit.get("passed"):
        return "finalize_fought"
    if state.get("iterations", 0) < state.get("max_iterations", settings.max_audit_iterations):
        return "draft_dossier"
    return "finalize_escalated"


def _rule_result_from_state(state: AegisState):
    from app.models.engine import RuleEngineResult

    return RuleEngineResult.model_validate(state.get("rule_result", {}))


def serialize_result(state: Dict[str, Any], persisted: bool = False) -> Dict[str, Any]:
    dossier = state.get("dossier")
    result = {
        "dispute_id": state.get("dispute_id"),
        "network": state.get("network"),
        "reason_code": state.get("reason_code"),
        "claim_type": state.get("claim_type"),
        "classification_source": state.get("classification_source"),
        "decision": state.get("decision"),
        "final_status": state.get("final_status"),
        "iterations_used": state.get("iterations", 0),
        "max_iterations": state.get("max_iterations", settings.max_audit_iterations),
        "win_probability": state.get("win_probability"),
        "expected_value_fight": state.get("ev_fight"),
        "expected_value_settle": state.get("ev_settle"),
        "primary_gap": state.get("primary_gap"),
        "rule_engine": state.get("rule_result", {}),
        "dossier": dossier,
        "audit_trail": state.get("audit_history", []),
        "notice": state.get("notice"),
        "persisted": persisted,
    }
    # Phase 1 & 2 — include lifecycle evidence and firewall assessment data when present
    if state.get("transaction_timeline") is not None or state.get("firewall_assessments") is not None:
        result["lifecycle"] = {
            "transaction_timeline": state.get("transaction_timeline", []),
            "evidence_missing": state.get("evidence_missing", []),
            "evidence_conflicts": state.get("evidence_conflicts", []),
            "evidence_completeness": state.get("evidence_completeness"),
            "firewall_assessments": state.get("firewall_assessments", []),
        }
    return result



def build_workflow():
    graph = StateGraph(AegisState)
    graph.add_node("parse_dispute", parse_dispute_node)
    graph.add_node("evaluate_rules", evaluate_rules_node)
    graph.add_node("route_decision", route_decision_node)
    graph.add_node("draft_dossier", draft_dossier_node)
    graph.add_node("audit_dossier", audit_dossier_node)
    graph.add_node("auto_settlement_notice", auto_settlement_notice_node)
    graph.add_node("finalize_fought", finalize_fought_node)
    graph.add_node("finalize_settled", finalize_settled_node)
    graph.add_node("finalize_escalated", finalize_escalated_node)

    graph.add_node("enrich_from_lifecycle", enrich_from_lifecycle_node)

    graph.add_edge(START, "enrich_from_lifecycle")
    graph.add_edge("enrich_from_lifecycle", "parse_dispute")
    graph.add_edge("parse_dispute", "evaluate_rules")
    graph.add_edge("evaluate_rules", "route_decision")
    graph.add_conditional_edges(
        "route_decision",
        route_after_route_decision,
        {
            "fight": "draft_dossier",
            "settle": "auto_settlement_notice",
            "escalate": "finalize_escalated",
        },
    )
    graph.add_edge("draft_dossier", "audit_dossier")
    graph.add_conditional_edges(
        "audit_dossier",
        route_after_audit,
        {
            "finalize_fought": "finalize_fought",
            "draft_dossier": "draft_dossier",
            "finalize_escalated": "finalize_escalated",
        },
    )
    graph.add_edge("auto_settlement_notice", "finalize_settled")
    graph.add_edge("finalize_fought", END)
    graph.add_edge("finalize_settled", END)
    graph.add_edge("finalize_escalated", END)

    return graph.compile()


workflow = build_workflow()
