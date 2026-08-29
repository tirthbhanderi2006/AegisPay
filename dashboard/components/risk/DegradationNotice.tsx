"use client";

import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui";

interface DegradationNoticeProps {
  notice?: string | null;
  evidenceQuality?: number;
  auditDegraded?: boolean;
}

export function DegradationNotice({
  notice,
  evidenceQuality,
  auditDegraded,
}: DegradationNoticeProps) {
  if (!notice && !auditDegraded && (evidenceQuality === undefined || evidenceQuality >= 0.85)) {
    return null;
  }

  return (
    <div className="p-4 rounded-xl bg-amber/10 border border-amber/30 text-ink space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0" />
          <span className="font-semibold text-sm text-amber uppercase tracking-wider font-mono">
            FAIL-SAFE DEGRADATION NOTICE
          </span>
        </div>
        <Badge variant="warning" size="sm" dot>DEGRADED EVALUATION</Badge>
      </div>

      <p className="text-xs text-ink-muted leading-relaxed">
        {notice ||
          "One or more external intelligence dependencies were unreachable during evaluation. AegisPay applied controlled fallback heuristics and penalized evidence quality."}
      </p>

      <div className="pt-2 border-t border-amber/20 flex flex-wrap gap-4 text-xs font-mono">
        {evidenceQuality !== undefined && (
          <div>
            <span className="text-ink-muted">Evidence Quality: </span>
            <span className="text-amber font-bold">{evidenceQuality.toFixed(2)}</span>
            <span className="text-ink-faint"> (Penalized)</span>
          </div>
        )}
        {auditDegraded && (
          <div>
            <span className="text-ink-muted">Audit Persistence: </span>
            <span className="text-red font-bold">VOLATILE (Degraded)</span>
          </div>
        )}
      </div>
    </div>
  );
}
