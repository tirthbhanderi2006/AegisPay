"use client";

import React, { useState } from "react";
import { Clock, Shield, CheckCircle, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui";

export interface TimelineEventItem {
  id: string;
  timestamp: string;
  stage: string;
  label: string;
  description: string;
  latency_ms?: number;
  status?: "success" | "warning" | "danger" | "info";
  metadata?: Record<string, any>;
}

export interface TimelineViewerProps {
  events: TimelineEventItem[];
  asOfCutoff?: string;
  onAsOfChange?: (asOf: string) => void;
  className?: string;
}

export function TimelineViewer({
  events,
  asOfCutoff,
  onAsOfChange,
  className = "",
}: TimelineViewerProps) {
  const [selectedAsOf, setSelectedAsOf] = useState<string>(
    asOfCutoff || (events.length > 0 ? events[events.length - 1].timestamp : "")
  );

  const handleCutoffChange = (ts: string) => {
    setSelectedAsOf(ts);
    onAsOfChange?.(ts);
  };

  const getStatusIcon = (status: string = "success") => {
    switch (status) {
      case "danger":
        return <XCircle className="w-3.5 h-3.5 text-red" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber" />;
      default:
        return <CheckCircle className="w-3.5 h-3.5 text-emerald" />;
    }
  };

  return (
    <div className={`space-y-4 select-text ${className}`}>
      {/* Temporal Boundary Banner */}
      <div className="p-3 bg-surface-subtle rounded border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" />
          <span className="font-mono font-semibold uppercase text-ink">
            Temporal Boundary (T &le; as_of)
          </span>
        </div>
        <span className="font-mono text-ink-muted text-[11px]">
          Cutoff: <strong className="text-ink">{selectedAsOf || "Present"}</strong>
        </span>
      </div>

      {/* Chronological Event Track */}
      <div className="relative pl-6 space-y-4 border-l border-line ml-3">
        {events.map((evt, idx) => {
          const isAtOrBefore = !selectedAsOf || new Date(evt.timestamp) <= new Date(selectedAsOf);

          return (
            <div
              key={evt.id || idx}
              onClick={() => handleCutoffChange(evt.timestamp)}
              className={`relative group cursor-pointer transition-opacity ${
                isAtOrBefore ? "opacity-100" : "opacity-40"
              }`}
            >
              {/* Bullet Node */}
              <div
                className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-surface border-2 flex items-center justify-center transition-colors ${
                  evt.status === "danger"
                    ? "border-red"
                    : evt.status === "warning"
                    ? "border-amber"
                    : "border-emerald"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    evt.status === "danger"
                      ? "bg-red"
                      : evt.status === "warning"
                      ? "bg-amber"
                      : "bg-emerald"
                  }`}
                />
              </div>

              {/* Event Card */}
              <div className="p-3.5 rounded border border-line bg-surface hover:bg-surface-subtle transition-colors space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[10px] text-accent px-1.5 py-0.5 bg-accent-subtle rounded border border-accent-line uppercase">
                      {evt.stage}
                    </span>
                    <span className="font-semibold text-xs text-ink">{evt.label}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px] text-ink-muted">
                    {evt.latency_ms !== undefined && (
                      <span className="text-ink-secondary">{evt.latency_ms.toFixed(2)}ms</span>
                    )}
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <p className="text-xs text-ink-secondary leading-relaxed">
                  {evt.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
