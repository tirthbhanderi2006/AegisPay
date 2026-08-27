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

        print(f"\n=== Ablation Experiment ===")
        for mode in ["session_only", "lifecycle_aware"]:
            o = results[mode]["overall"]
            lat = results[mode]["latency"]
            print(f"\n  [{mode}]")
            print(f"    Precision={o['precision']:.4f}  Recall={o['recall']:.4f}  F1={o['f1']:.4f}")
            print(f"    FPR={o['false_positive_rate']:.4f}")
            print(f"    Latency P50={lat['p50_ms']:.2f}ms  P95={lat['p95_ms']:.2f}ms  P99={lat['p99_ms']:.2f}ms")

        c = results["comparison"]
        print(f"\n  [delta (lifecycle - session)]")
        print(f"    Precision: {c['precision_delta']:+.4f}")
        print(f"    Recall:    {c['recall_delta']:+.4f}")
        print(f"    F1:        {c['f1_delta']:+.4f}")
        print(f"    FPR:       {c['fpr_delta']:+.4f}")


if __name__ == "__main__":
    main()
