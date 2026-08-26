import argparse
import json
import sys

from app.db import repository
from app.graph.workflow import build_initial_state, serialize_result, workflow
from app.models.dispute import DisputeEvent


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the AegisPay dispute pipeline on a fixture file.")
    parser.add_argument("--fixture", required=True, help="Path to a dispute webhook JSON fixture.")
    parser.add_argument("--no-db", action="store_true", help="Skip persistence attempt.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print output JSON.")
    args = parser.parse_args()

    with open(args.fixture, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    event = DisputeEvent.model_validate(payload)
    final_state = workflow.invoke(build_initial_state(event))

    persisted = False
    if not args.no_db:
        persisted = repository.save_dispute(
            dispute_id=final_state["dispute_id"],
            network=final_state["network"],
            reason_code=final_state["reason_code"],
            claim_type=final_state.get("claim_type") or "UNKNOWN_REQUIRES_HUMAN_REVIEW",
            decision=final_state.get("decision", "escalate"),
            final_status=final_state.get("final_status", "PENDING"),
            win_probability=final_state.get("win_probability", 0.0),
            iterations_used=final_state.get("iterations", 0),
            event_payload=event.model_dump(mode="json"),
            result=serialize_result(final_state, persisted=True),
        )
        if not persisted:
            print("[warn] database unavailable; result not persisted (docker compose up -d)", file=sys.stderr)

    result = serialize_result(final_state, persisted=persisted)
    print(json.dumps(result, indent=2 if args.pretty else None, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
