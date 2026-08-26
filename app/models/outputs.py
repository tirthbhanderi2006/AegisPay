from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.dispute import ClaimType


class EvidencePoint(BaseModel):
    category: str
    claim: str
    source_metric: str
    rule_mapping: str


class DossierDraft(BaseModel):
    executive_summary: str
    dispute_classification: str
    compelling_evidence_type: str
    evidence_points: List[EvidencePoint] = []
    rebuttal_narrative: str


class AuditVerdict(BaseModel):
    passed: bool
    confidence_score: float = Field(ge=0.0, le=1.0)
    deficiencies: List[str] = []
    suggested_revisions: List[str] = []


class MerchantNotice(BaseModel):
    notice_title: str
    notice_body: str
    improvement_tip: str


class ClaimClassification(BaseModel):
    claim_type: ClaimType
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
