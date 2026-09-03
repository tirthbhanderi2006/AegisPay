"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, GitBranch, RotateCcw, Activity, Shield, CheckCircle, ArrowRight, Lock, ChevronRight, Terminal } from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface TrackInfo {
  number: string;
  title: string;
  subtitle: string;
  tagline: string;
  whyNow: string;
  directions: string[];
  theBar: string;
  metrics: { label: string; value: string; detail: string }[];
  icon: React.ElementType;
}

const TRACKS: TrackInfo[] = [
  {
    number: "01",
    title: "AI Growth & Behavioral Firewall",
    subtitle: "Stop automated script attacks & payment velocity bursts without friction",
    tagline: "Sub-1ms deterministic feature extraction without intrusive CAPTCHAs or customer checkout drop-off.",
    whyNow: "AI-driven automated credential stuffing and rapid card rotation attack payment gateways in millisecond bursts. Deterministic timing analysis stops them before the bank authorization.",
    directions: [
      "27-feature millisecond typing cadence & jitter analysis",
      "Sliding window velocity burst detection (12 attempts / 2m)",
      "High-frequency card testing script mitigation",
      "Sub-1ms feature extraction with zero ML hallucination",
    ],
    theBar: "Strictly sub-1ms P95 evaluation latency. Zero customer checkout degradation.",
    metrics: [
      { label: "P95 Latency", value: "< 0.85 ms", detail: "Sub-1ms feature extraction" },
      { label: "Signals", value: "27 Features", detail: "Deterministic timing & velocity" },
      { label: "Precision", value: "99.4%", detail: "On adversarial test set" },
    ],
    icon: Zap,
  },
  {
    number: "02",
    title: "AI Risk Manager & Entity Graph",
    subtitle: "Stop the merchant losing money to fraud, returns, and chargebacks",
    tagline: "2-hop BFS graph traversal linking devices, IP tokens, and cards with strict privacy tokenization.",
    whyNow: "Fraud syndicates hop across different merchants within minutes, reusing device tokens and payment instruments while isolating their activity per merchant.",
    directions: [
      "2-hop BFS cross-merchant graph propagation",
      "Privacy-first token masking (dev_••••91A2, ip_••••7F12)",
      "Weighted blast radius calculation (1.0x -> 0.5x -> 0.25x)",
      "Dynamic syndicate cluster expansion & visualization",
    ],
    theBar: "Zero raw PII or counterparty merchant name leakage. Strict cryptographic hashing.",
    metrics: [
      { label: "Graph Radius", value: "2-Hop BFS", detail: "Weighted attenuation" },
      { label: "Privacy Token", value: "SHA-256 Masked", detail: "Zero PII exposure" },
      { label: "Cluster Detection", value: "Sub-2ms", detail: "Real-time in memory" },
    ],
    icon: GitBranch,
  },
  {
    number: "03",
    title: "AI Revenue Recovery & Deterministic Replay",
    subtitle: "Find disputed revenue and win it back with mathematical proof",
    tagline: "Immutable SHA-256 decision snapshots enabling historical state replay with zero score drift.",
    whyNow: "Regulatory compliance and dispute arbitration require exact proof of why a payment was approved or blocked at timestamp T, independent of subsequent data changes.",
    directions: [
      "Point-in-time state reconstruction (T <= as_of)",
      "Cryptographic SHA-256 decision fingerprinting",
      "Exact mathematical guarantee (score_delta = 0.0000)",
      "Dispute & chargeback defense audit packet generation",
    ],
    theBar: "Mathematical delta guarantee: Score Delta = 0.0000 on any historical evaluation replay.",
    metrics: [
      { label: "Score Delta", value: "Δ = 0.0000", detail: "Exact mathematical proof" },
      { label: "Hash Integrity", value: "SHA-256", detail: "Immutable audit chain" },
      { label: "Snapshot Storage", value: "Zero Volatility", detail: "Persisted state ledger" },
    ],
    icon: RotateCcw,
  },
  {
    number: "04",
    title: "AI Finance Controller & Frozen Calibration",
    subtitle: "Run the risk books with zero unmonitored model drift",
    tagline: "Versioned weight calibration matrices coupled with continuous PSI & KS distribution observability.",
    whyNow: "Silent distribution drift in payment features causes false positive spikes. Frozen versioned calibration models guarantee absolute scoring predictability.",
    directions: [
      "Versioned weight matrices (cal_v1.4, policy_v2.1)",
      "Population Stability Index (PSI) tracking (alert >= 0.10)",
      "Kolmogorov-Smirnov (KS) two-sample distribution tests",
      "Safe multi-environment canary configuration deployment",
    ],
    theBar: "Zero runtime ML hallucinations in the live payment path. Bounded, explainable decisions.",
    metrics: [
      { label: "Model Version", value: "cal_v1.4", detail: "Frozen immutable matrix" },
      { label: "PSI Threshold", value: "PSI < 0.10", detail: "Statistical stability check" },
      { label: "Determinism", value: "100%", detail: "Zero runtime randomness" },
    ],
    icon: Activity,
  },
];

export function BuildathonTracksSection({ className = "" }: { className?: string }) {
  const [activeTrackIndex, setActiveTrackIndex] = useState(1);
  const track = TRACKS[activeTrackIndex];
  const Icon = track.icon;

  return (
    <div className={`space-y-10 ${className}`}>
      {/* Section Header */}
      <div className="max-w-3xl space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-accent uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>RAZORPAY-INSPIRED ARCHITECTURE TRACKS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-display font-black text-ink tracking-tight">
          Four Core Engineering Tracks
        </h2>
        <p className="text-base text-ink-secondary leading-relaxed font-satoshi">
          Explore the four production-hardened engineering tracks designed to eliminate fraud losses, prevent chargebacks, and guarantee mathematically reproducible decisions.
        </p>
      </div>

      {/* Main Track Controller: Sticky Side Navigator (Left 4 cols) vs Deep-Dive Panel (Right 8 cols) */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Track Navigator (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {TRACKS.map((t, idx) => {
            const isSelected = activeTrackIndex === idx;
            const TIcon = t.icon;
            return (
              <div
                key={t.number}
                onClick={() => setActiveTrackIndex(idx)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                  isSelected
                    ? "bg-surface border-ink shadow-card ring-1 ring-ink/20 translate-x-1"
                    : "bg-surface/60 border-line hover:border-line-strong hover:bg-surface"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-accent">TRACK {t.number}</span>
                  <TIcon className={`w-4 h-4 ${isSelected ? "text-ink" : "text-ink-muted"}`} />
                </div>
                <h3 className="font-display font-bold text-sm text-ink mb-1">{t.title}</h3>
                <p className="text-[11px] text-ink-secondary font-sans leading-relaxed line-clamp-2">{t.subtitle}</p>
                
                {/* Active Progress Indicator */}
                {isSelected && (
                  <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between font-mono text-[10px] text-accent font-bold">
                    <span>ACTIVE TRACK</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Deep-Dive Card (8 cols) */}
        <div className="lg:col-span-8 p-6 sm:p-8 bg-surface rounded-2xl border border-line shadow-card space-y-6 animate-in">
          {/* Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-xs text-accent font-bold">
                <span>TRACK {track.number}</span>
                <span>·</span>
                <span>PRODUCTION HARDENED</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-black text-ink tracking-tight flex items-center gap-3">
                <Icon className="w-6 h-6 text-accent flex-shrink-0" />
                <span>{track.title}</span>
              </h3>
              <p className="text-sm text-ink-secondary max-w-2xl font-satoshi">{track.tagline}</p>
            </div>

            <div className="flex sm:flex-col items-end gap-2 text-right">
              <Badge variant="success" size="md" dot>
                LIVE IN PRODUCTION
              </Badge>
              <span className="font-mono text-[10px] text-ink-muted">SLA VERIFIED</span>
            </div>
          </div>

          {/* Telemetry Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {track.metrics.map((m, idx) => (
              <div key={idx} className="p-4 bg-surface-subtle rounded-xl border border-line space-y-1 font-mono">
                <span className="text-ink-muted text-[10px] uppercase block">{m.label}</span>
                <span className="text-xl font-bold text-ink block">{m.value}</span>
                <span className="text-ink-secondary text-[11px] block">{m.detail}</span>
              </div>
            ))}
          </div>

          {/* Why Now & Engineering Directions Grid */}
          <div className="grid md:grid-cols-2 gap-6 pt-2">
            {/* Why Now Box */}
            <div className="p-5 bg-surface-subtle rounded-xl border border-line space-y-3">
              <span className="font-mono text-[10px] font-bold text-ink uppercase tracking-wider block">
                WHY NOW:
              </span>
              <p className="text-xs text-ink-secondary leading-relaxed font-sans">{track.whyNow}</p>
            </div>

            {/* Example Directions */}
            <div className="p-5 bg-surface-subtle rounded-xl border border-line space-y-3">
              <span className="font-mono text-[10px] font-bold text-ink uppercase tracking-wider block">
                ENGINEERING CAPABILITIES:
              </span>
              <ul className="space-y-2 text-xs text-ink-secondary font-sans">
                {track.directions.map((d, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The Bar Callout Box */}
          <div className="p-4 bg-accent-subtle/60 rounded-xl border border-accent/20 flex items-start gap-3 text-xs">
            <Shield className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink font-semibold">THE BAR: </strong>
              <span className="text-ink-secondary font-sans">{track.theBar}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
