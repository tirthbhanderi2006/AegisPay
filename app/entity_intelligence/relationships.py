"""Phase 3 — Deterministic Relationship and Edge Models.

Defines directional and aggregated relationship edges between entity nodes.
Each relationship tracks occurrence frequency, success/failure counts,
and precise first/last seen temporal timestamps.
"""

from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from app.entity_intelligence.entities import mask_entity_id


class RelationshipType(str, Enum):
    USES_DEVICE = "USES_DEVICE"
    USES_IP = "USES_IP"
    SEEN_ON_MERCHANT = "SEEN_ON_MERCHANT"
    TRANSACTED_WITH_MERCHANT = "TRANSACTED_WITH_MERCHANT"
    ASSOCIATED_WITH_ACCOUNT = "ASSOCIATED_WITH_ACCOUNT"
    BELONGS_TO_ACCOUNT = "BELONGS_TO_ACCOUNT"
    BELONGS_TO_MERCHANT = "BELONGS_TO_MERCHANT"
    USES_PAYMENT_INSTRUMENT = "USES_PAYMENT_INSTRUMENT"


def make_edge_id(source_id: str, target_id: str, relationship_type: RelationshipType) -> str:
    """Generate a deterministic, canonical edge identifier."""
    return f"{source_id}:{relationship_type.value}:{target_id}"


class EntityEdge(BaseModel):
    """Deterministic relationship edge between two entity nodes."""
    edge_id: str
    source_id: str
    target_id: str
    relationship_type: RelationshipType
    first_seen: str  # ISO-8601
    last_seen: str   # ISO-8601
    occurrence_count: int = 1
    success_count: int = 0
    failure_count: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_anonymized_dict(self) -> Dict[str, Any]:
        """Return representation safe for cross-merchant presentation."""
        return {
            "edge_id": f"{mask_entity_id(self.source_id)}:{self.relationship_type.value}:{mask_entity_id(self.target_id)}",
            "relationship_type": self.relationship_type.value,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "occurrence_count": self.occurrence_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
        }
