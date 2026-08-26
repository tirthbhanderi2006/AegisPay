from typing import List, Optional

from pydantic import BaseModel


class EvidenceFlags(BaseModel):
    three_ds_completed: bool = False
    three_ds_attempted_only: bool = False
    named_recipient_signature: bool = False
    physical_delivery_proof: bool = False
    identifier_match_with_history: bool = False


class QualifyingTransaction(BaseModel):
    transaction_id: Optional[str] = None
    days_before_dispute: int
    matched_identifier: str


class RuleEngineResult(BaseModel):
    ce3_applicable: bool
    ce3_qualified: bool
    qualifying_tx_count: int
    qualifying_transactions: List[QualifyingTransaction] = []
    rejection_reasons: List[str] = []
    evidence_flags: EvidenceFlags
