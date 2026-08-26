from typing import Any, Dict, List, Optional, TypedDict

from app.models.dispute import DisputeEvent


class AegisState(TypedDict, total=False):
    event: DisputeEvent
    dispute_id: str
    network: str
    reason_code: str
    reason_code_description: Optional[str]
    amount: float
    currency: str
    claim_type: Optional[str]
    classification_source: str
    classifier_confidence: float
    needs_human_review: bool
    rule_result: Dict[str, Any]
    primary_gap: str
    win_probability: float
    ev_fight: float
    ev_settle: float
    decision: str
    dossier: Optional[Dict[str, Any]]
    draft_llm_failed: bool
    audit: Optional[Dict[str, Any]]
    audit_history: List[Dict[str, Any]]
    iterations: int
    max_iterations: int
    notice: Optional[Dict[str, Any]]
    final_status: str
    errors: List[str]
    # Phase 1 — lifecycle evidence enrichment
    transaction_timeline: Optional[List[Dict[str, Any]]]
    evidence_records: Optional[List[Dict[str, Any]]]
    evidence_missing: Optional[List[str]]
    evidence_conflicts: Optional[List[str]]
    evidence_completeness: Optional[float]
