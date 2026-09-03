"use client";

import React, { useState } from "react";
import { RotateCcw, Shield, CheckCircle, Lock, ArrowRight, Play, FileText, Hash } from "lucide-react";
import { Badge, Button, DecisionBadge } from "@/components/ui";

export function DeterministicReplayShowcase({ className = "" }: { className?: string }) {
  const [replaying, setReplaying] = useState(false);
  const [replayed, setReplayed] = useState(false);

  const handleRunReplay = async () => {
    setReplaying(true);
    setReplayed(false);
    await new Promise((r) => setTimeout(r, 900));
    setReplayed(true);
    setReplaying(false);
  };

  return (
    <div className={`p-6 sm:p-8 bg-surface rounded-xl border border-line shadow-card space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-accent font-bold">
            <RotateCcw className="w-4 h-4 text-accent" />
            <span>DETERMINISTIC REPLAY & TEMPORAL AUDIT</span>
          </div>
          <h3 className="text-2xl font-bold text-ink tracking-tight">
            Point-in-Time Historical Verification
          </h3>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Re-evaluate past transactions under the exact frozen historical configuration snapshot ($T \le as\_of$). Mathematically guarantees zero score drift for regulatory audit and chargeback arbitration.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleRunReplay}
          disabled={replaying}
          leftIcon={<Play className={`w-3.5 h-3.5 ${replaying ? "animate-spin" : ""}`} />}
        >
          {replaying ? "Re-evaluating Snapshot..." : "Replay Transaction txn_vel_9021"}
        </Button>
      </div>

      {/* Side-by-Side Comparison: Original vs Replayed */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Decision Box */}
        <div className="p-5 bg-surface-subtle rounded-xl border border-line space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-ink-muted" />
              <span className="font-bold text-xs text-ink uppercase font-mono">
                ORIGINAL EVALUATION (T₀)
              </span>
            </div>
            <DecisionBadge decision="BLOCK" size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Risk Score</span>
              <span className="text-lg font-bold text-red">0.9140</span>
            </div>
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Timestamp</span>
              <span className="text-xs font-semibold text-ink">2026-08-27T10:14:02Z</span>
            </div>
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Calibration</span>
              <span className="text-xs font-semibold text-ink">cal_v1.4</span>
            </div>
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Policy Engine</span>
              <span className="text-xs font-semibold text-ink">policy_v2.1</span>
            </div>
          </div>

          {/* Audit Snapshot Hash */}
          <div className="p-3 bg-surface rounded border border-line space-y-1 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-muted text-[10px] uppercase">
              <Hash className="w-3 h-3" />
              <span>Immutable SHA-256 Decision Hash</span>
            </div>
            <code className="text-[10px] text-ink block break-all">
              a4f891b2c3d4e5f67890123456789abcdefa4f891b2c3d4e5f67890123456789abc
            </code>
          </div>
        </div>

        {/* Replayed Evaluation Box */}
        <div className={`p-5 bg-surface-subtle rounded-xl border transition-all ${
          replayed ? "border-emerald-border ring-1 ring-emerald/20" : "border-line"
        } space-y-4`}>
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald" />
              <span className="font-bold text-xs text-ink uppercase font-mono">
                REPLAYED EVALUATION (T &le; as_of)
              </span>
            </div>
            <DecisionBadge decision="BLOCK" size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Replayed Score</span>
              <span className="text-lg font-bold text-red">0.9140</span>
            </div>
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Score Delta</span>
              <span className="text-lg font-bold text-emerald">Δ = 0.0000 ✓</span>
            </div>
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Reconstructed Cal</span>
              <span className="text-xs font-semibold text-ink">cal_v1.4 (Matched)</span>
            </div>
            <div className="p-3 bg-surface rounded border border-line">
              <span className="text-ink-muted text-[10px] uppercase block">Replay Latency</span>
              <span className="text-xs font-semibold text-emerald">0.42 ms</span>
            </div>
          </div>

          {/* Verification Status */}
          <div className="p-3 bg-emerald-bg rounded border border-emerald-border space-y-1 text-xs">
            <div className="flex items-center gap-2 text-emerald font-bold font-mono">
              <CheckCircle className="w-4 h-4" />
              <span>DETERMINISTIC REPLAY VERIFIED</span>
            </div>
            <p className="text-ink-secondary text-[11px]">
              Exact mathematical match across all 27 behavioral signals, graph weights, and policy thresholds. Zero score drift.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
