"""CLI commands for Phase 4 decision replay and audit inspection."""

import argparse
import json
import sys
from typing import Any

from app.audit.repository import audit_repo
from app.audit.replay import replay_decision


def cmd_replay(args: Any) -> None:
    """Replay a specific transaction decision and verify determinism."""
    snapshot = audit_repo.get_snapshot(args.transaction_id)
    if not snapshot:
        print(f"Error: Transaction snapshot not found: {args.transaction_id}", file=sys.stderr)
        sys.exit(1)

    result = replay_decision(snapshot)
    print(f"\n=== Replaying Decision for Transaction: {args.transaction_id} ===")
    print(f"  Original Score:      {result.original_score}")
    print(f"  Replayed Score:      {result.replayed_score}")
    print(f"  Score Delta:         {result.score_delta}")
    print(f"  Original Decision:   {result.original_decision.value if hasattr(result.original_decision, 'value') else result.original_decision}")
    print(f"  Replayed Decision:   {result.replayed_decision.value if hasattr(result.replayed_decision, 'value') else result.replayed_decision}")
    print(f"  Calibration Version: {result.calibration_version}")
    print(f"  Deterministic Match: {result.deterministic_match}")

    if not result.deterministic_match:
        print(f"  [MISMATCH DETECTED]: {json.dumps(result.input_diff, indent=2)}")
        sys.exit(2)


def main() -> None:
    parser = argparse.ArgumentParser(description="AegisPay Decision Replay CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_replay = subparsers.add_parser("replay", help="Replay a decision from audit snapshot")
    p_replay.add_argument("--transaction-id", type=str, required=True, help="Transaction ID to replay")

    args = parser.parse_args()
    if args.command == "replay":
        cmd_replay(args)


if __name__ == "__main__":
    main()
