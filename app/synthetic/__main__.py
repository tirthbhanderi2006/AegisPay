"""CLI entry point for the synthetic payment environment.

Usage:
    python -m app.synthetic generate --sessions 100 --seed 42
    python -m app.synthetic evaluate --sessions 100 --seed 42
    python -m app.synthetic ablation --sessions 100 --seed 42
"""

import argparse
import json
import sys


def main():
    parser = argparse.ArgumentParser(
        prog="app.synthetic",
        description="AegisPay Synthetic Payment Environment & Evaluation",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # generate
    gen_p = sub.add_parser("generate", help="Generate synthetic payment sessions")
    gen_p.add_argument("--sessions", type=int, default=100)
    gen_p.add_argument("--seed", type=int, default=42)
    gen_p.add_argument("--output", type=str, default=None, help="Output JSON file")

    # evaluate
    eval_p = sub.add_parser("evaluate", help="Evaluate firewall against synthetic data")
    eval_p.add_argument("--sessions", type=int, default=100)
    eval_p.add_argument("--seed", type=int, default=42)
    eval_p.add_argument("--output", type=str, default=None, help="Output JSON file")

    # ablation
    abl_p = sub.add_parser("ablation", help="Run session-only vs lifecycle-aware ablation")
    abl_p.add_argument("--sessions", type=int, default=100)
    abl_p.add_argument("--seed", type=int, default=42)
    abl_p.add_argument("--output", type=str, default=None, help="Output JSON file")

    # breakdown
    bd_p = sub.add_parser("breakdown", help="Investigate CARD_TESTING A-E breakdown")
    bd_p.add_argument("--sessions", type=int, default=180)
    bd_p.add_argument("--seed", type=int, default=42)
    bd_p.add_argument("--output", type=str, default=None, help="Output JSON file")

    # sensitivity
    sens_p = sub.add_parser("sensitivity", help="Run threshold sensitivity analysis")
    sens_p.add_argument("--sessions", type=int, default=180)
    sens_p.add_argument("--seed", type=int, default=42)
    sens_p.add_argument("--output", type=str, default=None, help="Output JSON file")

    args = parser.parse_args()

    if args.command == "generate":
        from app.synthetic.generator import generate_dataset
        dataset = generate_dataset(sessions=args.sessions, seed=args.seed)
        summary = {
            "total_sessions": len(dataset),
            "seed": args.seed,
            "scenarios": {},
            "total_events": 0,
        }
        for sample in dataset:
            sc = sample["scenario"]
            summary["scenarios"][sc] = summary["scenarios"].get(sc, 0) + 1
            summary["total_events"] += len(sample["events"])

        if args.output:
            with open(args.output, "w") as f:
                json.dump({"summary": summary, "dataset": dataset}, f, indent=2, default=str)
            print(f"Dataset written to {args.output}")
        else:
            print(json.dumps(summary, indent=2))

        print(f"\nGenerated {len(dataset)} sessions with {summary['total_events']} total events")
        print("NOTE: This dataset is synthetic and is used only to validate the behavioral")
        print("intelligence methodology. It does not represent Razorpay proprietary data.")

    elif args.command == "evaluate":
        from app.firewall.evaluation import run_evaluation
        results = run_evaluation(sessions=args.sessions, seed=args.seed, lifecycle_aware=True)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2)
            print(f"Results written to {args.output}")

        print(f"\n=== Firewall Evaluation (lifecycle-aware, {results['sessions']} sessions) ===")
        o = results["overall"]
        print(f"Precision: {o['precision']:.4f}")
        print(f"Recall:    {o['recall']:.4f}")
        print(f"F1:        {o['f1']:.4f}")
        print(f"Detection Rate:      {o['detection_rate']:.4f}")
        print(f"False Positive Rate:  {o['false_positive_rate']:.4f}")
        print(f"TP={o['true_positives']} FP={o['false_positives']} TN={o['true_negatives']} FN={o['false_negatives']}")

        print(f"\nLatency: P50={results['latency']['p50_ms']:.2f}ms  "
              f"P95={results['latency']['p95_ms']:.2f}ms  "
              f"P99={results['latency']['p99_ms']:.2f}ms")

        print("\n--- Per-Scenario ---")
        for label, m in results["per_scenario"].items():
            print(f"  {label:40s}  n={m['count']:3d}  "
                  f"intent_acc={m['intent_accuracy']:.2f}  "
                  f"action_acc={m['action_accuracy']:.2f}  "
                  f"avg_risk={m['avg_risk_score']:.3f}")

    elif args.command == "ablation":
        from app.firewall.evaluation import run_ablation
        results = run_ablation(sessions=args.sessions, seed=args.seed)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2)
            print(f"Results written to {args.output}")

        print(f"\n=== Ablation Experiment ({args.sessions} sessions) ===")
        for mode in ["session_only", "lifecycle_aware"]:
            o = results[mode]["overall"]
            lat = results[mode]["latency"]
            print(f"\n  [{mode}]")
            print(f"    Precision={o['precision']:.4f}  Recall={o['recall']:.4f}  F1={o['f1']:.4f}")
            print(f"    Detection Rate={o['detection_rate']:.4f}  FPR={o['false_positive_rate']:.4f}")
            print(f"    Latency P50={lat['p50_ms']:.2f}ms  P95={lat['p95_ms']:.2f}ms  P99={lat['p99_ms']:.2f}ms")

        c = results["comparison"]
        print(f"\n  [delta (lifecycle - session)]")
        print(f"    Precision: {c['precision_delta']:+.4f}")
        print(f"    Recall:    {c['recall_delta']:+.4f}")
        print(f"    F1:        {c['f1_delta']:+.4f}")
        print(f"    FPR:       {c['fpr_delta']:+.4f}")

        print("\n  [Per-Scenario Risk & Accuracy Deltas]")
        for sc, cmp_data in results.get("scenario_comparison", {}).items():
            print(f"    {sc:36s} SessionRisk={cmp_data['session_only_risk']:.3f} -> LifecycleRisk={cmp_data['lifecycle_aware_risk']:.3f} (delta {cmp_data['risk_delta']:+.3f})")


    elif args.command == "breakdown":
        from app.firewall.evaluation import run_card_testing_breakdown
        results = run_card_testing_breakdown(sessions=args.sessions, seed=args.seed)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2)
            print(f"Results written to {args.output}")

        print(f"\n=== CARD_TESTING A-E Breakdown ({args.sessions} total sessions) ===")
        print(f"{'Variant':18s} | {'Samples':7s} | {'AvgRisk':7s} | {'MinRisk':7s} | {'MaxRisk':7s} | {'ALLOW%':7s} | {'CHALLENGE%':10s} | {'BLOCK%':7s}")
        print("-" * 85)
        for var, d in results.items():
            print(f"{var:18s} | {d['samples']:7d} | {d['avg_risk']:7.3f} | {d['min_risk']:7.3f} | {d['max_risk']:7.3f} | {d['allow_pct']:6.1f}% | {d['challenge_pct']:9.1f}% | {d['block_pct']:6.1f}%")

    elif args.command == "sensitivity":
        from app.firewall.evaluation import run_threshold_sensitivity
        results = run_threshold_sensitivity(sessions=args.sessions, seed=args.seed)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(results, f, indent=2)
            print(f"Results written to {args.output}")

        print(f"\n=== Threshold Sensitivity Analysis ({results['total_samples']} samples) ===")
        print(f"{'Low':5s} | {'High':5s} | {'Precision':9s} | {'Recall':8s} | {'F1':8s} | {'FPR':8s} | {'ALLOW%':7s} | {'CHALLENGE%':10s} | {'BLOCK%':7s}")
        print("-" * 88)
        for g in results["grid"]:
            print(f"{g['low_threshold']:5.2f} | {g['high_threshold']:5.2f} | {g['precision']:9.4f} | {g['recall']:8.4f} | {g['f1']:8.4f} | {g['fpr']:8.4f} | {g['allow_pct']:6.1f}% | {g['challenge_pct']:9.1f}% | {g['block_pct']:6.1f}%")


if __name__ == "__main__":
    main()

