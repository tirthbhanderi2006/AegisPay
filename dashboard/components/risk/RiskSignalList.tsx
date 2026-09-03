"use client";

import React from "react";
import { Badge } from "@/components/ui";
import type { RiskSignalResponse } from "@/lib/types";

export interface RiskSignalListProps {
  signals: RiskSignalResponse[];
  className?: string;
}

export function RiskSignalList({ signals, className = "" }: RiskSignalListProps) {
  if (!signals || signals.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-ink-muted italic">
        No elevated risk signals triggered.
      </div>
    );
  }

  const getSeverityVariant = (sev: string): "danger" | "warning" | "info" | "neutral" => {
    switch (sev.toLowerCase()) {
      case "critical":
      case "high":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "neutral";
    }
  };

  return (
    <div className={`space-y-2 select-text ${className}`}>
      {signals.map((signal, idx) => {
        const contributionPct = Math.round(signal.contribution * 100);
        return (
          <div
            key={signal.name + idx}
            className="p-3 rounded border border-line bg-surface hover:bg-surface-subtle transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityVariant(signal.severity)} size="sm" dot>
                  {signal.severity.toUpperCase()}
                </Badge>
                <span className="font-mono text-xs font-semibold text-ink">
                  {signal.name}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-accent">
                  +{contributionPct}%
                </span>
                <span className="font-mono text-[10px] text-ink-muted ml-1">weight</span>
              </div>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              {signal.description}
            </p>

            {signal.value !== undefined && (
              <div className="mt-1.5 pt-1.5 border-t border-line/60 flex items-center justify-between text-[10px] font-mono text-ink-faint">
                <span>Observed Feature Metric:</span>
                <span className="text-ink font-medium">
                  {typeof signal.value === "object" ? JSON.stringify(signal.value) : String(signal.value)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
