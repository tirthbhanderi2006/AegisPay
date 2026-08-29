"use client";

import React from "react";
import { clsx } from "clsx";
import { AlertCircle, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import type { RiskSignalResponse } from "@/lib/types";
import { Badge } from "@/components/ui";

interface RiskSignalListProps {
  signals: RiskSignalResponse[];
  compact?: boolean;
}

export function RiskSignalList({ signals, compact = false }: RiskSignalListProps) {
  if (!signals || signals.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-surface-overlay/40 border border-line text-center">
        <ShieldCheck className="w-5 h-5 text-emerald mx-auto mb-1.5" />
        <p className="text-sm font-medium text-ink">Zero Anomaly Signals</p>
        <p className="text-xs text-ink-muted">Transaction conforms strictly to historical merchant baseline.</p>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return <Badge variant="danger" size="sm" dot>HIGH</Badge>;
      case "medium":
        return <Badge variant="warning" size="sm" dot>MEDIUM</Badge>;
      default:
        return <Badge variant="info" size="sm" dot>LOW</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return <AlertCircle className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-azure flex-shrink-0 mt-0.5" />;
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {signals.map((sig, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-overlay text-xs text-ink border border-line font-mono"
            title={`${sig.description} (Contribution: +${Math.round(sig.contribution * 100)}%)`}
          >
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                sig.severity === "high" || sig.severity === "critical"
                  ? "bg-red"
                  : sig.severity === "medium"
                  ? "bg-amber"
                  : "bg-azure"
              )}
            />
            {sig.name.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {signals.map((sig, idx) => (
        <div
          key={idx}
          className="p-3.5 rounded-lg bg-surface-overlay/60 border border-line flex items-start justify-between gap-3 hover:border-line-strong transition-colors"
        >
          <div className="flex items-start gap-3">
            {getSeverityIcon(sig.severity)}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ink">
                  {sig.name.replace(/_/g, " ").toUpperCase()}
                </span>
                {getSeverityBadge(sig.severity)}
              </div>
              <p className="text-xs text-ink-muted mt-1">{sig.description}</p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-mono uppercase text-ink-faint tracking-wider block">
              WEIGHT
            </span>
            <span className="font-mono text-xs font-bold text-ink">
              +{Math.round(sig.contribution * 100)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
