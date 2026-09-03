"use client";

import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export interface DegradationNoticeProps {
  notice?: string | null;
  evidenceQuality?: number;
  auditDegraded?: boolean;
  className?: string;
}

export function DegradationNotice({
  notice,
  evidenceQuality,
  auditDegraded = false,
  className = "",
}: DegradationNoticeProps) {
  if (!notice && !auditDegraded && (evidenceQuality === undefined || evidenceQuality >= 0.85)) {
    return null;
  }

  return (
    <div
      className={`p-3.5 rounded border border-amber-border bg-amber-bg text-xs ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber font-mono uppercase tracking-wider text-[11px]">
            Controlled Dependency Degradation Active
          </p>
          <p className="text-ink-secondary leading-relaxed">
            {notice ||
              "One or more upstream dependencies (Entity Graph / FX / Audit) experienced latency degradation. Deterministic evaluation completed via controlled fallback policy."}
          </p>
          {evidenceQuality !== undefined && evidenceQuality < 0.85 && (
            <div className="font-mono text-[10px] text-ink-muted">
              Evidence Quality Index: <strong className="text-amber">{(evidenceQuality * 100).toFixed(0)}%</strong> (reduced from 100% baseline).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
