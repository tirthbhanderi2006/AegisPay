"use client";

import React, { useState } from "react";
import { Clock, Shield, CheckCircle, AlertTriangle, ArrowRight, Filter } from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  stage: string;
  label: string;
  description: string;
  status?: "success" | "warning" | "danger" | "info";
  latency_ms?: number;
  metadata?: Record<string, any>;
}

interface TimelineViewerProps {
  events: TimelineEvent[];
  asOfTimestamp?: string;
  onAsOfChange?: (asOf: string) => void;
  showAsOfControl?: boolean;
}

export function TimelineViewer({
  events,
  asOfTimestamp,
  onAsOfChange,
  showAsOfControl = true,
}: TimelineViewerProps) {
  const [sliderIndex, setSliderIndex] = useState(events.length - 1);

  // Filter events based on temporal cutoff T <= as_of
  const effectiveEvents = asOfTimestamp
    ? events.filter((e) => new Date(e.timestamp).getTime() <= new Date(asOfTimestamp).getTime())
    : events;

  return (
    <div className="space-y-6">
      {showAsOfControl && events.length > 1 && (
        <div className="p-4 rounded-xl bg-surface-overlay/80 border border-line space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold" />
              <span className="font-semibold text-xs text-ink uppercase tracking-wider font-mono">
                Temporal Cutoff Control (T &le; as_of)
              </span>
            </div>
            <Badge variant="info" size="sm">ZERO HINDSIGHT BIAS</Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-ink-muted">
              <span>Start: {new Date(events[0].timestamp).toLocaleTimeString()}</span>
              <span className="text-gold font-bold">
                as_of: {events[sliderIndex] ? new Date(events[sliderIndex].timestamp).toLocaleTimeString() : "Live"}
              </span>
              <span>End: {new Date(events[events.length - 1].timestamp).toLocaleTimeString()}</span>
            </div>
            <input
              type="range"
              min={0}
              max={events.length - 1}
              value={sliderIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setSliderIndex(idx);
                if (onAsOfChange && events[idx]) {
                  onAsOfChange(events[idx].timestamp);
                }
              }}
              className="w-full accent-gold cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Vertical Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
        {effectiveEvents.map((event, idx) => {
          const isLatest = idx === effectiveEvents.length - 1;
          return (
            <div key={event.id || idx} className="relative group">
              {/* Dot */}
              <div
                className={clsx(
                  "absolute -left-6 top-1 w-4 h-4 rounded-full border-2 bg-surface transition-all duration-200",
                  event.status === "danger"
                    ? "border-red text-red"
                    : event.status === "warning"
                    ? "border-amber text-amber"
                    : "border-gold text-gold",
                  isLatest && "ring-4 ring-gold/20"
                )}
              />

              <div className="p-3.5 rounded-lg bg-surface-overlay/50 border border-line hover:border-line-strong transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gold font-semibold uppercase">
                      {event.stage}
                    </span>
                    <span className="text-sm font-semibold text-ink">{event.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
                    {event.latency_ms !== undefined && (
                      <span className="text-ink-faint">+{event.latency_ms.toFixed(2)}ms</span>
                    )}
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <p className="text-xs text-ink-muted mt-1.5">{event.description}</p>

                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-line/60 flex flex-wrap gap-2 text-[11px] font-mono text-ink-faint">
                    {Object.entries(event.metadata).map(([k, v]) => (
                      <span key={k} className="px-1.5 py-0.5 rounded bg-surface border border-line/50">
                        {k}: <strong className="text-ink">{String(v)}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
