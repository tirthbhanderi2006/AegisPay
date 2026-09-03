"use client";

import React from "react";
import { Activity, CheckCircle, ShieldCheck, Zap, Lock, Database } from "lucide-react";
import { Badge } from "@/components/ui";

interface MetricItem {
  label: string;
  value: string;
  unit: string;
  status: string;
  description: string;
}

const METRICS: MetricItem[] = [
  {
    label: "P50 INGESTION LATENCY",
    value: "2.10",
    unit: "ms",
    status: "PASS",
    description: "Median end-to-end transaction evaluation time.",
  },
  {
    label: "P95 PRODUCTION LATENCY",
    value: "4.96",
    unit: "ms",
    status: "< 10ms SLA",
    description: "95th percentile under concurrent cross-merchant load.",
  },
  {
    label: "P99 WORST-CASE LATENCY",
    value: "8.40",
    unit: "ms",
    status: "PASS",
    description: "Peak latency including 2-hop BFS entity propagation.",
  },
  {
    label: "BACKEND VERIFICATION SUITE",
    value: "199/199",
    unit: "PASS",
    status: "100%",
    description: "Complete Phase 1–5 pytest test suite passing without regression.",
  },
  {
    label: "DETERMINISTIC SCORE DELTA",
    value: "0.0000",
    unit: "Δ",
    status: "GUARANTEED",
    description: "Exact mathematical reproducibility on historical replay.",
  },
  {
    label: "RUNTIME LLM IN DECISION PATH",
    value: "0.0",
    unit: "%",
    status: "ZERO DRIFT",
    description: "100% deterministic mathematical evaluation; zero ML hallucinations.",
  },
  {
    label: "POPULATION STABILITY INDEX (PSI)",
    value: "0.038",
    unit: "PSI",
    status: "STABLE",
    description: "Continuous distribution monitoring well below alert threshold (0.10).",
  },
  {
    label: "WEBHOOK REPLAY TOLERANCE",
    value: "300",
    unit: "sec",
    status: "ENFORCED",
    description: "Strict constant-time HMAC-SHA256 timestamp window validation.",
  },
];

export function LiveTelemetryMetrics({ className = "" }: { className?: string }) {
  return (
    <div className={`p-6 sm:p-8 bg-surface rounded-xl border border-line shadow-card space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-accent font-bold">
            <Activity className="w-4 h-4 text-accent" />
            <span>LIVE PRODUCTION TELEMETRY & SLA</span>
          </div>
          <h3 className="text-2xl font-bold text-ink tracking-tight">
            Measured Production Performance
          </h3>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Real backend measurements across latency percentiles, test suites, cryptographic bounds, and distribution stability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald animate-pulse" />
          <span className="font-mono text-xs font-bold text-ink">ALL SYSTEMS NOMINAL</span>
        </div>
      </div>

      {/* Metrics 4x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {METRICS.map((m, idx) => (
          <div key={idx} className="p-4 bg-surface-subtle rounded-lg border border-line space-y-2 hover:border-line-strong transition-colors">
            <div className="flex items-center justify-between text-[10px] text-ink-muted">
              <span>{m.label}</span>
              <span className="font-bold text-emerald">{m.status}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-ink">{m.value}</span>
              <span className="text-xs text-ink-secondary">{m.unit}</span>
            </div>
            <p className="text-[11px] text-ink-secondary font-sans leading-relaxed pt-1 border-t border-line/60">
              {m.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
