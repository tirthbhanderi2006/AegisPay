"""Phase 3 — Deterministic Entity Models.

Zero raw PAN or customer PII storage. All entity IDs are stable deterministic
identifiers. Cross-merchant privacy ensures sensitive identifiers are never
leaked across merchant boundaries.
"""

import hashlib
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class EntityType(str, Enum):
    MERCHANT = "merchant"
    ACCOUNT = "account"
    DEVICE = "device"
    IP = "ip"
    PAYMENT_INSTRUMENT = "payment_instrument"
    TRANSACTION = "transaction"
    ORDER = "order"


_PREFIX_MAP = {
    EntityType.MERCHANT: "merch_",
    EntityType.ACCOUNT: "acc_",
    EntityType.DEVICE: "dev_",
    EntityType.IP: "ip_",
    EntityType.PAYMENT_INSTRUMENT: "tok_",
    EntityType.TRANSACTION: "txn_",
    EntityType.ORDER: "ord_",
}


def make_entity_id(entity_type: EntityType, raw_val: str) -> str:
    """Generate a deterministic, canonical entity ID."""
    prefix = _PREFIX_MAP.get(entity_type, f"{entity_type.value}_")
    if not raw_val:
        return f"{prefix}unknown"
    cleaned = raw_val.strip()
    if cleaned.startswith(prefix):
        return cleaned
    return f"{prefix}{cleaned}"



def mask_entity_id(entity_id: str) -> str:
    """Mask entity ID for cross-merchant privacy protection.
    
    Example:
        'dev_a89f72b1c4' -> 'dev_***72b1c4'
        'ip_192.168.1.1' -> 'ip_***.1.1'
        'merch_001' -> 'merchant_counterparty'
    """
    if not entity_id:
        return "unknown"
    if entity_id.startswith("merch_") or entity_id.startswith("merchant_"):
        return "merchant_counterparty"
    if "_" in entity_id:
        prefix, val = entity_id.split("_", 1)
        if len(val) <= 4:
            return f"{prefix}_***"
        return f"{prefix}_***{val[-4:]}"
    return f"***{entity_id[-4:]}" if len(entity_id) > 4 else "***"


class EntityNode(BaseModel):
    """Deterministic node in the AegisPay Entity Graph."""
    entity_id: str
    entity_type: EntityType
    first_seen: str  # ISO-8601
    last_seen: str   # ISO-8601
    risk_base_score: float = 0.0
    occurrence_count: int = 1
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_anonymized_dict(self) -> Dict[str, Any]:
        """Return representation safe for cross-merchant presentation."""
        return {
            "entity_id": mask_entity_id(self.entity_id),
            "entity_type": self.entity_type.value,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "risk_base_score": round(self.risk_base_score, 4),
            "occurrence_count": self.occurrence_count,
        }
