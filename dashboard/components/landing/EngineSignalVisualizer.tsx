"use client";

import React, { useState } from "react";
import { Sliders, Shield, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Badge, Button, DecisionBadge } from "@/components/ui";

interface SignalSlider {
  id: string;
  name: string;
  category: "BEHAVIORAL" | "ENTITY" | "VELOCITY" | "GEO";
  description: string;
  min: number;
  max: number;
  step: number;
  value: number;
  weight: number;
  unit: string;
}

const DEFAULT_SIGNALS: SignalSlider[] = [
  {
    id: "velocity_2m",
    name: "Payment Velocity (2m Window)",
    category: "VELOCITY",
    description: "Number of payment attempts from same device within 120s sliding window.",
    min: 1,
    max: 15,
    step: 1,
    value: 1,
    weight: 0.065,
    unit: " attempts",
  },
  {
    id: "typing_jitter",
    name: "Keystroke Jitter Cadence",
    category: "BEHAVIORAL",
    description: "Standard deviation of inter-keystroke intervals during checkout form entry.",
    min: 5,
    max: 120,
    step: 5,
    value: 15,
    weight: 0.004,
    unit: " ms σ",
  },
  {
    id: "entity_links",
    name: "Cross-Merchant Entity Links",
    category: "ENTITY",
    description: "Distinct merchant counterparty checkout sessions linked to hardware token.",
    min: 1,
    max: 6,
    step: 1,
    value: 1,
    weight: 0.12,
    unit: " merchants",
  },
  {
    id: "geo_drift",
    name: "IP Geolocation Distance Drift",
    category: "GEO",
    description: "Kilometers distance between IP geolocation and historical customer profile.",
    min: 0,
    max: 5000,
    step: 250,
    value: 50,
    weight: 0.00008,
    unit: " km",
  },
];

export function EngineSignalVisualizer({ className = "" }: { className?: string }) {
  const [signals, setSignals] = useState<SignalSlider[]>(DEFAULT_SIGNALS);

  const handleSliderChange = (id: string, newVal: number) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value: newVal } : s))
    );
  };

  const handleReset = () => {
    setSignals(DEFAULT_SIGNALS);
  };

  // Compute deterministic score
  const rawScore = signals.reduce((acc, s) => {
    return acc + s.value * s.weight;
  }, 0.02);

  const normalizedScore = Math.min(0.99, Math.max(0.01, rawScore));
  const scorePercent = (normalizedScore * 100).toFixed(1);

  // Policy Thresholds: ALLOW <= 0.30, CHALLENGE 0.30-0.70, BLOCK > 0.70
  let decision: "ALLOW" | "CHALLENGE" | "BLOCK" = "ALLOW";
  let decisionColor = "#15803D";
  if (normalizedScore > 0.7) {
    decision = "BLOCK";
    decisionColor = "#B91C1C";
  } else if (normalizedScore >= 0.3) {
    decision = "CHALLENGE";
    decisionColor = "#B45309";
  }

  return (
    <div className={`p-6 sm:p-8 bg-surface rounded-xl border border-line shadow-card space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-accent font-bold">
            <Sliders className="w-4 h-4 text-accent" />
            <span>INTERACTIVE SIGNAL WEIGHT ENGINE</span>
          </div>
          <h3 className="text-2xl font-bold text-ink tracking-tight">
            Deterministic Signal Contribution Matrix
          </h3>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Adjust behavioral, velocity, and entity signals below to observe how the deterministic policy dynamically evaluates risk thresholds with zero runtime model drift.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="self-start sm:self-auto"
        >
          Reset Signals
        </Button>
      </div>

      {/* Main Grid: Interactive Sliders (Left 7) vs Real-Time Policy Gauge (Right 5) */}
      <div className="grid lg:grid-cols-12 gap-8 items-center">
        {/* Sliders Area (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {signals.map((sig) => {
            const contribution = (sig.value * sig.weight * 100).toFixed(1);
            return (
              <div key={sig.id} className="p-4 bg-surface-subtle rounded-lg border border-line space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{sig.name}</span>
                    <Badge variant="neutral" size="sm">
                      {sig.category}
                    </Badge>
                  </div>
                  <div className="font-mono text-xs font-bold text-ink">
                    <span>{sig.value}</span>
                    <span className="text-ink-muted text-[10px]">{sig.unit}</span>
                  </div>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min={sig.min}
                  max={sig.max}
                  step={sig.step}
                  value={sig.value}
                  onChange={(e) => handleSliderChange(sig.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-line rounded-lg appearance-none cursor-pointer accent-accent"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary">
                  <span className="text-ink-muted">{sig.description}</span>
                  <span className="font-bold text-accent">+{contribution} pts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time Policy Decision Outcome (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-surface-subtle rounded-xl border border-line space-y-6 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-wider">
            Deterministic Decision Output
          </span>

          {/* Large Calibrated Score Dial */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#E5E5E3"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={decisionColor}
                strokeWidth="10"
                strokeDasharray="314.159"
                strokeDashoffset={314.159 * (1 - normalizedScore)}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-mono text-ink">{scorePercent}</span>
              <span className="text-[10px] font-mono uppercase text-ink-muted">RISK SCORE</span>
            </div>
          </div>

          {/* Decision Outcome Badge */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <DecisionBadge decision={decision} size="lg" />
            </div>
            <p className="text-xs text-ink-secondary pt-2">
              {decision === "ALLOW"
                ? "Transaction within normal velocity & behavioral thresholds."
                : decision === "CHALLENGE"
                ? "Moderate risk deviation; 3DS authentication requested."
                : "Critical syndicate risk or velocity burst; blocked immediately."}
            </p>
          </div>

          {/* Policy Threshold Reference Bar */}
          <div className="w-full pt-4 border-t border-line space-y-2 font-mono text-[10px]">
            <div className="flex justify-between text-ink-muted">
              <span>ALLOW (&le;30)</span>
              <span>CHALLENGE (30-70)</span>
              <span>BLOCK (&gt;70)</span>
            </div>
            <div className="w-full h-2 rounded-full flex overflow-hidden">
              <div className="w-[30%] bg-emerald/60" />
              <div className="w-[40%] bg-amber/60" />
              <div className="w-[30%] bg-red/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
