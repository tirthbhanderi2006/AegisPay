"""Phase 3 — Entity Intelligence CLI.

Usage:
  python -m app.entity_intelligence.cli ablation [--samples 500] [--seed 42]
  python -m app.entity_intelligence.cli temporal-test
  python -m app.entity_intelligence.cli explain --entity-id dev_ring_0000
"""

import argparse
import json
import sys
from typing import Optional

from app.entity_intelligence.evaluation import run_cross_merchant_ablation, run_temporal_integrity_validation
from app.entity_intelligence.repository import entity_repo
from app.entity_intelligence.risk import compute_cross_merchant_risk


def main() -> None:
    parser = argparse.ArgumentParser(description="AegisPay Phase 3 — Cross-Merchant Entity Intelligence CLI")
    subparsers = parser.add_subparsers(dest="command", help="Subcommand to run")

    # Ablation
    abl_p = subparsers.add_parser("ablation", help="Run Headline Merchant-Local vs Cross-Merchant Ablation")
    abl_p.add_argument("--samples", type=int, default=500, help="Number of synthetic samples")
    abl_p.add_argument("--seed", type=int, default=42, help="Random seed")
    abl_p.add_argument("--output", type=str, default=None, help="Path to write JSON results")

    # Temporal Test
    subparsers.add_parser("temporal-test", help="Validate Temporal Cutoff and Hindsight Guardrails")

    # Explain
    exp_p = subparsers.add_parser("explain", help="Generate Explainable Risk Assessment for an Entity")
    exp_p.add_argument("--entity-id", type=str, required=True, help="Entity ID (e.g. dev_001, ip_1.1.1.1)")
    exp_p.add_argument("--as-of", type=str, default=None, help="Optional ISO timestamp cutoff")

    args = parser.parse_args()

    if args.command == "ablation":
        print(f"\n=== Running Headline Cross-Merchant Ablation Experiment ({args.samples} samples, seed={args.seed}) ===")
        results = run_cross_merchant_ablation(samples=args.samples, seed=args.seed)

        local = results["merchant_local"]
        cross = results["cross_merchant"]
        delta = results["delta"]

        print(f"\n  [Merchant-Local Engine (Siloed)]")
        print(f"    Precision={local['precision']:.4f}  Recall={local['recall']:.4f}  F1={local['f1']:.4f}")
        print(f"    Detection Rate={local['detection_rate']:.4f}  FPR={local['fpr']:.4f}")
        print(f"    Latency P50={local['latency_p50_ms']:.3f}ms  P95={local['latency_p95_ms']:.3f}ms  P99={local['latency_p99_ms']:.3f}ms")

        print(f"\n  [Cross-Merchant Engine (Network Graph)]")
        print(f"    Precision={cross['precision']:.4f}  Recall={cross['recall']:.4f}  F1={cross['f1']:.4f}")
        print(f"    Detection Rate={cross['detection_rate']:.4f}  FPR={cross['fpr']:.4f}")
        print(f"    Latency P50={cross['latency_p50_ms']:.3f}ms  P95={cross['latency_p95_ms']:.3f}ms  P99={cross['latency_p99_ms']:.3f}ms")

        print(f"\n  [Delta (Cross-Merchant Gain)]")
        print(f"    Precision: {delta['precision']:+.4f}")
        print(f"    Recall:    {delta['recall']:+.4f} (Network Memory Gain)")
        print(f"    F1 Score:  {delta['f1']:+.4f}")
        print(f"    FPR:       {delta['fpr']:+.4f}")

        print(f"\n  [Per-Scenario Risk Breakdown]")
        for sc, comp in results.get("scenario_comparison", {}).items():
            print(f"    {sc:32s} LocalRisk={comp['local_avg_risk']:.3f} -> CrossRisk={comp['cross_avg_risk']:.3f} (delta {comp['risk_delta']:+.3f}) [{comp['expected_cross_action']}]")

        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2)
            print(f"\nResults saved to {args.output}")

    elif args.command == "temporal-test":
        print("\n=== Validating Temporal Integrity (No Hindsight Leakage) ===")
        res = run_temporal_integrity_validation()
        print(f"  as_of T0 ({res['as_of_t0']}): Risk = {res['risk_score_at_t0']} | Merchants = {res['merchants_observed_at_t0']}")
        print(f"  as_of T1 ({res['as_of_t1']}): Risk = {res['risk_score_at_t1']} | Merchants = {res['merchants_observed_at_t1']}")
        print(f"  Hindsight Leakage Detected: {res['hindsight_leakage_detected']}")
        print(f"  Temporal Integrity Verified: {res['is_temporal_integrity_preserved']}")

    elif args.command == "explain":
        graph = entity_repo.get_graph()
        assessment = compute_cross_merchant_risk(graph, args.entity_id, as_of=args.as_of)
        print(f"\n=== Explainable Entity Risk Assessment: {assessment.entity_id} ===")
        print(json.dumps(assessment.to_anonymized_dict(), indent=2))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
