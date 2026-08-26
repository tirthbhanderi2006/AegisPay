"""Transaction reconstruction service -- pure deterministic, no LLM.

Given a transaction_id, retrieves its lifecycle events and evidence from the
lifecycle repository, then produces a TransactionReconstruction with:
  - ordered timeline
  - evidence present / missing
  - contradictory events
  - duplicate events
  - completeness score (0.0-1.0)
"""

import logging
from typing import Dict, List, Optional

from app.models.lifecycle import (
    LIFECYCLE_ORDER,
    EventType,
    TimelineEntry,
    TransactionReconstruction,
)

logger = logging.getLogger(__name__)

# The canonical happy-path lifecycle ordering.
_EXPECTED_ORDER = [et.value for et in LIFECYCLE_ORDER]


def _detect_contradictions(events_by_type: Dict[str, List[str]]) -> List[str]:
    """Detect events that occur out-of-order relative to the canonical lifecycle.

    For example, DELIVERED timestamped before FULFILLMENT_STARTED.
    """
    contradictions: List[str] = []

    # Build a mapping of event_type -> earliest timestamp string
    earliest: Dict[str, str] = {}
    for etype, timestamps in events_by_type.items():
        if timestamps:
            earliest[etype] = min(timestamps)

    for i, earlier_type in enumerate(_EXPECTED_ORDER):
        for later_type in _EXPECTED_ORDER[i + 1:]:
            if earlier_type in earliest and later_type in earliest:
                if earliest[later_type] < earliest[earlier_type]:
                    contradictions.append(
                        f"{later_type} (at {earliest[later_type]}) occurred before "
                        f"{earlier_type} (at {earliest[earlier_type]})"
                    )
    return contradictions


def _detect_duplicates(events_by_type: Dict[str, List[str]]) -> List[str]:
    """Detect event types that appear more than once."""
    duplicates: List[str] = []
    for etype, timestamps in events_by_type.items():
        if len(timestamps) > 1:
            duplicates.append(f"{etype} appears {len(timestamps)} times")
    return duplicates


def reconstruct_from_events(
    transaction_id: str,
    raw_events: List[dict],
) -> TransactionReconstruction:
    """Build a TransactionReconstruction from a list of raw event dicts.

    This is the core deterministic logic, decoupled from the repository so it
    can be tested without a database.
    """
    # Sort by timestamp ascending
    sorted_events = sorted(raw_events, key=lambda e: e.get("timestamp", ""))

    timeline: List[TimelineEntry] = []
    events_by_type: Dict[str, List[str]] = {}

    for ev in sorted_events:
        etype = ev.get("event_type", "UNKNOWN")
        ts = str(ev.get("timestamp", ""))
        timeline.append(
            TimelineEntry(
                event_id=ev.get("event_id", ""),
                event_type=etype,
                timestamp=ts,
                source=ev.get("source", "unknown"),
                metadata=ev.get("metadata", {}),
            )
        )
        events_by_type.setdefault(etype, []).append(ts)

    evidence_present = [et for et in _EXPECTED_ORDER if et in events_by_type]
    evidence_missing = [et for et in _EXPECTED_ORDER if et not in events_by_type]
    contradictory_events = _detect_contradictions(events_by_type)
    duplicate_events = _detect_duplicates(events_by_type)
    completeness = len(evidence_present) / len(_EXPECTED_ORDER) if _EXPECTED_ORDER else 0.0

    return TransactionReconstruction(
        transaction_id=transaction_id,
        timeline=timeline,
        evidence_present=evidence_present,
        evidence_missing=evidence_missing,
        contradictory_events=contradictory_events,
        duplicate_events=duplicate_events,
        completeness_score=round(completeness, 4),
    )


def reconstruct_transaction(
    transaction_id: str,
    repo: Optional[object] = None,
) -> Optional[TransactionReconstruction]:
    """High-level entry point: fetch events from the repo and reconstruct.

    Returns None if the transaction has no stored events.
    """
    if repo is None:
        from app.lifecycle_repo import lifecycle_repository
        repo = lifecycle_repository

    if not repo.transaction_exists(transaction_id):
        return None

    raw_events = repo.get_events_for_transaction(transaction_id)
    if not raw_events:
        return None

    return reconstruct_from_events(transaction_id, raw_events)
