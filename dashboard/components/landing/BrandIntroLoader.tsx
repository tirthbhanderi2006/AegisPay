"use client";

import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";

export function BrandIntroLoader() {
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);

  const STAGES = [
    "INITIALIZING DETERMINISTIC KERNEL...",
    "CALIBRATING 27 BEHAVIORAL FEATURES...",
    "CHECKING 2-HOP ENTITY GRAPH CLUSTERS...",
    "AEGISPAY OPERATIONAL · 0.0% RUNTIME ML DRIFT",
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 350);
    const timer2 = setTimeout(() => setStage(2), 700);
    const timer3 = setTimeout(() => setStage(3), 1100);
    const timer4 = setTimeout(() => setLoading(false), 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-canvas flex flex-col items-center justify-center select-none transition-opacity duration-500 ease-out">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#0F52BA_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4 animate-in">
        {/* Brand Emblem */}
        <div className="relative w-16 h-16 rounded-2xl bg-ink flex items-center justify-center shadow-pop">
          <span className="font-display font-black text-2xl text-white">A</span>
          {/* Outer Ring Pulse */}
          <div className="absolute -inset-1 rounded-2xl border border-accent/40 animate-ping opacity-30" />
        </div>

        {/* Brand Name */}
        <div className="space-y-1">
          <h1 className="font-display font-black text-3xl sm:text-4xl text-ink tracking-tight">
            AEGISPAY
          </h1>
          <p className="font-mono text-[11px] text-ink-muted tracking-widest uppercase">
            DETERMINISTIC RISK INFRASTRUCTURE
          </p>
        </div>

        {/* Progress Bar & Sequence Telemetry */}
        <div className="w-64 space-y-2 pt-2">
          <div className="w-full h-1 bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-accent font-semibold tracking-wider h-4">
            {STAGES[stage]}
          </p>
        </div>
      </div>
    </div>
  );
}
