"""Phase 3 — AegisPay Cross-Merchant Entity Intelligence package.

Deterministic entity graph, risk propagation engine, privacy-preserving
cross-merchant attribution, and temporal reconstruction.
"""

from app.entity_intelligence.entities import EntityNode, EntityType
from app.entity_intelligence.relationships import EntityEdge, RelationshipType
from app.entity_intelligence.graph import EntityGraph, ClusterAnalysis
from app.entity_intelligence.risk import (
    CrossMerchantRiskAssessment,
    CrossMerchantSignal,
    CrossMerchantFeatureVector,
    compute_cross_merchant_risk,
)

__all__ = [
    "EntityType",
    "EntityNode",
    "RelationshipType",
    "EntityEdge",
    "EntityGraph",
    "ClusterAnalysis",
    "CrossMerchantRiskAssessment",
    "CrossMerchantSignal",
    "CrossMerchantFeatureVector",
    "compute_cross_merchant_risk",
]
