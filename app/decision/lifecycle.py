"""Decision state tracking and lifecycle transitions."""

from enum import Enum
from typing import Dict, Optional
from pydantic import BaseModel


class TransactionLifecycleState(str, Enum):
    EVALUATED = "EVALUATED"
    AUTHORIZED = "AUTHORIZED"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"
    CHALLENGED = "CHALLENGED"
    BLOCKED = "BLOCKED"
    DISPUTED = "DISPUTED"
    REFUNDED = "REFUNDED"


class DecisionLifecycleRecord(BaseModel):
    transaction_id: str
    merchant_id: str
    decision_id: str
    state: TransactionLifecycleState
    initial_action: str
    updated_at: str
