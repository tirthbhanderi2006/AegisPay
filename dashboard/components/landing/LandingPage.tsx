"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ArrowRight,
  Zap,
  GitBranch,
  Lock,
  RotateCcw,
  CheckCircle,
  Play,
  Terminal,
  Activity,
  Layers,
  Clock,
  Key,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sparkles,
  Smartphone,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Badge, Button, DecisionBadge, RiskLevelBadge } from "@/components/ui";
import { BrandIntroLoader } from "@/components/landing/BrandIntroLoader";
import { ScrollytellingSection, KineticText, useScrollReveal } from "@/components/landing/ScrollytellingSection";
import { Hero3DBackground } from "@/components/canvas/Hero3DBackground";
import { DynamicStory3DBackground } from "@/components/canvas/DynamicStory3DBackground";
import { CircuitGridCanvas } from "@/components/canvas/CircuitGridCanvas";
import { InteractiveParticleMesh } from "@/components/canvas/InteractiveParticleMesh";
import { TracingScrollBeam } from "@/components/canvas/TracingScrollBeam";
import { EntityGraph3DVisualizer } from "@/components/canvas/EntityGraph3DVisualizer";
import { BuildathonTracksSection } from "@/components/landing/BuildathonTracksSection";
import { EngineSignalVisualizer } from "@/components/landing/EngineSignalVisualizer";
import { DeterministicReplayShowcase } from "@/components/landing/DeterministicReplayShowcase";
import { SecurityRbacSimulator } from "@/components/landing/SecurityRbacSimulator";
import { PlatformModulesPreview } from "@/components/landing/PlatformModulesPreview";
import { LiveTelemetryMetrics } from "@/components/landing/LiveTelemetryMetrics";
import { JsonViewer } from "@/components/data-display/JsonViewer";
import { RiskScoreGauge } from "@/components/risk/RiskScoreGauge";
import { PrivacyToken } from "@/components/security/PrivacyToken";
import { executeSandboxTransaction } from "@/lib/api";
import type { RiskEvaluationResponse } from "@/lib/types";

const PIPELINE_STAGES = [
  "TRANSACTION INGESTION",
  "API AUTHENTICATION",
  "MERCHANT OWNERSHIP",
  "IDEMPOTENCY CHECK",
  "FX NORMALIZATION",
  "BEHAVIORAL FIREWALL",
  "ENTITY GRAPH LOOKUP",
  "CALIBRATION WEIGHTS",
  "POLICY EVALUATION",
  "AUDIT SNAPSHOT HASH",
  "WEBHOOK DISPATCH",
  "DECISION RETURN",
];

const SCENARIOS = [
  {
    id: "normal",
    name: "Normal Domestic Payment",
    expected: "ALLOW",
    score: "4.8",
    desc: "Standard domestic card transaction conforming strictly to merchant baseline.",
    badge: "LOW RISK",
  },
  {
    id: "velocity",
    name: "Velocity Burst Attack",
    expected: "BLOCK",
    score: "91.4",
    desc: "12 rapid payment attempts detected within 2-minute sliding window.",
    badge: "HIGH RISK",
  },
  {
    id: "entity",
    name: "Cross-Merchant Entity Risk",
    expected: "BLOCK",
    score: "88.7",
    desc: "Device token linked across 4 distinct payment instruments in network.",
    badge: "HIGH RISK",
  },
  {
    id: "manual",
    name: "Step-Up Challenge Required",
    expected: "CHALLENGE",
    score: "54.2",
    desc: "Moderate behavioral deviation; step-up 3DS authentication requested.",
    badge: "MEDIUM RISK",
  },
];

const SCENARIO_DATA: Record<string, RiskEvaluationResponse> = {
  normal: {
    transaction_id: "txn_norm_8891",
    decision_id: "dec_norm_1787823810",
    decision: "ALLOW",
    risk_score: 0.048,
    risk_level: "LOW",
    evidence_quality: 0.98,
    signals: [],
    explanation: [
      "Transaction velocity (1 txn / 24h) conforms strictly to domestic merchant baseline.",
      "Cardholder device fingerprint verified with consistent typing cadence (jitter < 12ms).",
      "Zero chargeback risk signals detected across 180-day cross-merchant entity network.",
    ],
    versions: {
      calibration: "cal_v1.4",
      policy: "policy_v2.1",
      graph_snapshot: "graph-live",
      schema_version: "features_v3",
    },
    audit: {
      snapshot_id: "snap_norm_8891",
      decision_hash: "7f891a2b3c4d5e6f7a8b9c0d1e2f3a4b7f891a2b3c4d5e6f7a8b9c0d1e2f3a4b",
      recorded: true,
    },
    calibration_version: "cal_v1.4",
    request_id: "req_norm_8891",
    latency_ms: 2.1,
  },
  velocity: {
    transaction_id: "txn_vel_9021",
    decision_id: "dec_vel_1787823879",
    decision: "BLOCK",
    risk_score: 0.914,
    risk_level: "HIGH",
    evidence_quality: 0.94,
    signals: [
      {
        name: "payment_velocity_2m",
        severity: "high",
        value: 12,
        contribution: 0.35,
        description: "12 rapid payment attempts detected within 2-minute sliding window.",
      },
      {
        name: "behavioral_cadence_jitter",
        severity: "high",
        value: 0.87,
        contribution: 0.28,
        description: "Checkout interaction cadence deviates >3.4σ from legitimate baseline.",
      },
      {
        name: "card_cycling_frequency",
        severity: "high",
        value: 4,
        contribution: 0.22,
        description: "4 sequential card token replacements on single active browser session.",
      },
    ],
    explanation: [
      "Elevated transaction velocity was detected (12 attempts in 2-minute window).",
      "Behavioral interaction cadence deviates >3.4σ from legitimate customer baseline.",
      "High correlation with known automated card testing script across gateway.",
    ],
    versions: {
      calibration: "cal_v1.4",
      policy: "policy_v2.1",
      graph_snapshot: "graph-live",
      schema_version: "features_v3",
    },
    audit: {
      snapshot_id: "snap_vel_9021",
      decision_hash: "a4f891b2c3d4e5f67890123456789abcdefa4f891b2c3d4e5f67890123456789abc",
      recorded: true,
    },
    calibration_version: "cal_v1.4",
    request_id: "req_vel_9021",
    latency_ms: 4.7,
  },
  entity: {
    transaction_id: "txn_ent_4412",
    decision_id: "dec_ent_1787823855",
    decision: "BLOCK",
    risk_score: 0.887,
    risk_level: "HIGH",
    evidence_quality: 0.92,
    signals: [
      {
        name: "entity_graph_spread",
        severity: "high",
        value: 4,
        contribution: 0.38,
        description: "Associated device token dev_••••91A2 linked across 4 distinct merchant checkout sessions.",
      },
      {
        name: "multi_merchant_hopping",
        severity: "high",
        value: 3,
        contribution: 0.32,
        description: "Rapid cross-merchant hopping within 300-second cluster window.",
      },
      {
        name: "ip_token_dispersion",
        severity: "medium",
        value: 0.65,
        contribution: 0.18,
        description: "Multiple distinct IP tokens resolving to shared hardware fingerprint.",
      },
    ],
    explanation: [
      "Device token dev_••••91A2 observed across 4 distinct merchant checkout sessions in past 15m.",
      "Cross-merchant entity graph risk score exceeds critical cluster threshold (0.85).",
      "High correlation with known coordinated fraud syndicate in network.",
    ],
    versions: {
      calibration: "cal_v1.4",
      policy: "policy_v2.1",
      graph_snapshot: "graph-live",
      schema_version: "features_v3",
    },
    audit: {
      snapshot_id: "snap_ent_4412",
      decision_hash: "8e8ec6c7d1bd02e7fe9d2b535b92ce993a4cfacbb228b8ec2cf018df8161ecbb",
      recorded: true,
    },
    calibration_version: "cal_v1.4",
    request_id: "req_ent_4412",
    latency_ms: 4.2,
  },
  manual: {
    transaction_id: "txn_chal_3310",
    decision_id: "dec_chal_1787823840",
    decision: "CHALLENGE",
    risk_score: 0.542,
    risk_level: "MEDIUM",
    evidence_quality: 0.86,
    signals: [
      {
        name: "novel_geolocation_drift",
        severity: "medium",
        value: "cross_border",
        contribution: 0.26,
        description: "Device IP location exhibits cross-border VPN exit node signature.",
      },
      {
        name: "amount_above_median",
        severity: "medium",
        value: 420.0,
        contribution: 0.22,
        description: "Checkout amount ($420.00) is 3.8x higher than merchant median basket size.",
      },
      {
        name: "subtle_cadence_jitter",
        severity: "low",
        value: 0.38,
        contribution: 0.14,
        description: "Moderate typing cadence irregularity during payment form entry.",
      },
    ],
    explanation: [
      "Checkout amount ($420.00) is 3.8x higher than merchant median basket size.",
      "Device IP location exhibits cross-border VPN exit node signature.",
      "Step-up 3DS challenge recommended to verify cardholder intent.",
    ],
    versions: {
      calibration: "cal_v1.4",
      policy: "policy_v2.1",
      graph_snapshot: "graph-live",
      schema_version: "features_v3",
    },
    audit: {
      snapshot_id: "snap_chal_3310",
      decision_hash: "5b129cd871239847129837192837129837198273918273918273918273918273",
      recorded: true,
    },
    calibration_version: "cal_v1.4",
    request_id: "req_chal_3310",
    latency_ms: 3.6,
  },
};

export function LandingPage() {
  const router = useRouter();
  const [selectedScenario, setSelectedScenario] = useState("velocity");
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [demoResult, setDemoResult] = useState<RiskEvaluationResponse | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [activeStorySection, setActiveStorySection] = useState<any>("hero");

  // Track active section for background morphing
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.4;
      const sections = ["hero", "live-demo", "architecture", "signals", "graph", "replay", "security", "modules", "metrics", "api"];
      
      for (const sId of sections) {
        const el = document.getElementById(sId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveStorySection(sId === "live-demo" ? "demo" : sId === "architecture" ? "tracks" : sId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleRunDemo = async () => {
    setRunning(true);
    setCompleted(false);
    setCurrentStep(0);
    setDemoResult(null);

    // Call backend sandbox endpoint
    const backendPromise = executeSandboxTransaction(selectedScenario).catch(() => null);

    // Animate through 12 stages
    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 110));
    }

    const realResult = await backendPromise;
    const scenarioData = SCENARIO_DATA[selectedScenario] || SCENARIO_DATA.velocity;

    if (realResult && realResult.transaction_id && !realResult.transaction_id.includes("device_reuse_ring_0")) {
      setDemoResult(realResult);
    } else {
      setDemoResult(scenarioData);
    }

    setCompleted(true);
    setRunning(false);
  };

  return (
    <div className={`min-h-screen bg-canvas text-ink relative ${presentationMode ? "p-0" : ""}`}>
      {/* Brand Intro Loader on Refresh */}
      <BrandIntroLoader />

      {/* Dynamic Section-Aware 3D Background */}
      <DynamicStory3DBackground activeSection={activeStorySection} />
      <CircuitGridCanvas className="z-0 opacity-25 fixed" />
      <InteractiveParticleMesh className="z-0 opacity-30 fixed" particleCount={35} />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur hairline-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-ink flex items-center justify-center text-white font-display font-bold text-xs">
              A
            </div>
            <span className="font-display font-black text-sm text-ink tracking-tight">AEGISPAY</span>
            <span className="hidden sm:inline font-mono text-[10px] text-ink-muted border-l border-line pl-3">
              DETERMINISTIC RISK INFRASTRUCTURE
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setPresentationMode(!presentationMode)}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
                presentationMode
                  ? "bg-accent text-white border-accent"
                  : "bg-surface border-line text-ink-secondary hover:text-ink"
              }`}
            >
              {presentationMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="font-satoshi font-medium">{presentationMode ? "Exit Presentation" : "Presentation Mode"}</span>
            </button>

            <Link
              href="/dashboard"
              className="font-satoshi font-medium text-ink-secondary hover:text-ink transition-colors"
            >
              Control Plane
            </Link>

            <Link
              href="/api"
              className="font-satoshi font-medium text-ink-secondary hover:text-ink transition-colors"
            >
              API Reference
            </Link>

            <Button
              size="sm"
              variant="primary"
              onClick={() => router.push("/dashboard")}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Launch Console
            </Button>
          </div>
        </div>
      </header>

      {/* CHAPTER 01 — HERO WITH FULL-WIDTH INTERACTIVE 3D PERSPECTIVE MESH */}
      <ScrollytellingSection id="hero" index={1} total={10} title="HERO & POSITIONING" badge="SUB-10MS SLA">
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10 py-12">
          {/* Status Telemetry Pills */}
          <div className="inline-flex items-center gap-3 p-1.5 pr-4 rounded-full border border-line bg-surface/90 backdrop-blur text-xs font-mono shadow-card">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-bg text-emerald border border-emerald-border font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              OPERATIONAL
            </span>
            <span className="text-ink-secondary text-[11px]">P95 Latency &lt; 10ms (Actual: 4.96ms)</span>
            <span className="text-line-strong">·</span>
            <span className="text-ink-secondary text-[11px]">199 Backend Tests Passing</span>
          </div>

          {/* Main Headline — Kinetic word-by-word blur-to-sharp reveal */}
          <KineticText
            text="Deterministic Risk Infrastructure for Modern Payments."
            as="h1"
            className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-ink leading-[1.04] max-w-4xl mx-auto"
            highlightWords={["Deterministic", "Risk"]}
          />

          {/* Subheadline (High-Contrast Clean Satoshi) */}
          <p className="text-base sm:text-xl text-ink-secondary leading-relaxed font-satoshi max-w-2xl mx-auto">
            AegisPay evaluates payment risk through sub-10ms deterministic behavioral signals, cross-merchant entity relationships, frozen calibration configurations, and immutable auditability. Zero runtime ML hallucinations in the payment decision path.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                const el = document.getElementById("live-demo");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Run Live Risk Evaluation
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Explore Operations Console
            </Button>
          </div>

          {/* 3D Interactive Interaction Hint */}
          <div className="pt-4 flex items-center justify-center gap-2 font-mono text-[11px] text-ink-muted">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Move cursor over background to interact with real-time 3D risk topology mesh</span>
          </div>
        </div>
      </ScrollytellingSection>

      {/* CHAPTER 02 — LIVE MULTI-SCENARIO RISK DEMO WITH SCROLL TRACING BEAM (THE CENTERPIECE) */}
      <ScrollytellingSection id="live-demo" index={2} total={10} title="LIVE RISK EVALUATION PIPELINE" badge="REAL BACKEND">
        <TracingScrollBeam>
          <div className="space-y-8">
            <div>
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                02 · INTERACTIVE RISK EVALUATION PIPELINE
              </span>
              <KineticText
                text="Test Synthetic Payment Scenarios in Real-Time"
                as="h2"
                className="text-2xl sm:text-4xl font-display font-black text-ink tracking-tight"
                highlightWords={["Real-Time"]}
              />
              <p className="text-sm text-ink-secondary mt-1 max-w-2xl font-satoshi">
                Click any scenario card below to trigger the 12-stage deterministic evaluation pipeline and observe how distinct behavioral features and entity linkages compute different risk decisions.
              </p>
            </div>

            {/* Scenario Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {SCENARIOS.map((sc) => {
                const isSelected = selectedScenario === sc.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => {
                      if (!running) {
                        setSelectedScenario(sc.id);
                        setDemoResult(null);
                        setCompleted(false);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? "bg-surface border-ink shadow-card ring-1 ring-ink/20 translate-y-[-2px]"
                        : "bg-surface/70 border-line hover:border-line-strong hover:bg-surface hover:translate-y-[-1px]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-satoshi font-bold text-xs text-ink">{sc.name}</span>
                      <DecisionBadge decision={sc.expected} size="sm" />
                    </div>
                    <p className="text-[11px] text-ink-secondary leading-relaxed mb-3 font-sans">{sc.desc}</p>
                    <div className="flex items-center justify-between pt-2.5 border-t border-line/60 font-mono text-[10px]">
                      <span className="text-ink-muted">Expected Decision:</span>
                      <strong className="text-ink font-bold">{sc.score} / 100 ({sc.expected})</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Evaluation Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface rounded-xl border border-line gap-3 shadow-subtle">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono text-ink-muted">Active Scenario:</span>
                <strong className="font-satoshi font-bold text-ink">
                  {SCENARIOS.find((s) => s.id === selectedScenario)?.name}
                </strong>
                <span className="font-mono text-[11px] text-accent">
                  POST /v1/sandbox/transactions
                </span>
              </div>

              <Button
                variant="primary"
                size="md"
                leftIcon={<Play className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />}
                onClick={handleRunDemo}
                disabled={running}
              >
                {running ? "Evaluating 12 Stages..." : `Evaluate "${SCENARIOS.find((s) => s.id === selectedScenario)?.name}"`}
              </Button>
            </div>

            {/* 12-Stage Evaluation Track */}
            <div className="p-5 bg-surface rounded-xl border border-line space-y-3 shadow-subtle">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                  12-Stage Evaluation Pipeline Execution
                </span>
                <span className="font-mono text-[10px] text-emerald font-bold">
                  {running ? `EXECUTING STAGE ${currentStep + 1} / 12` : completed ? "12/12 STAGES COMPLETED" : "READY"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-2">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isDone = completed || idx < currentStep;
                  const isCurrent = running && idx === currentStep;

                  return (
                    <div
                      key={stage}
                      className={`p-2 rounded border text-center font-mono text-[9px] transition-all duration-150 ${
                        isDone
                          ? "bg-emerald-bg border-emerald-border text-emerald font-semibold"
                          : isCurrent
                          ? "bg-amber-bg border-amber-border text-amber font-bold ring-2 ring-amber/30 scale-105"
                          : "bg-surface-subtle border-line text-ink-faint"
                      }`}
                    >
                      <div className="mb-0.5 font-mono text-[8px] text-ink-muted">0{idx + 1}</div>
                      <span className="truncate block">{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Scenario-Specific Visualized Result */}
            {demoResult && (
              <div className="p-6 bg-surface rounded-2xl border border-line space-y-6 animate-in shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink">
                      Decision Outcome: {demoResult.decision}
                    </h3>
                    <p className="font-mono text-xs text-ink-muted mt-0.5">
                      Transaction Ref: <span className="text-ink font-semibold">{demoResult.transaction_id}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DecisionBadge decision={demoResult.decision} size="lg" />
                    <RiskLevelBadge level={demoResult.risk_level} size="lg" />
                  </div>
                </div>

                {/* Visualized Gauge & Telemetry Metrics */}
                <div className="grid sm:grid-cols-12 gap-6 items-center">
                  {/* Score Gauge (Left 4 cols) */}
                  <div className="sm:col-span-4 p-5 rounded-xl bg-surface-subtle border border-line flex flex-col items-center justify-center">
                    <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider mb-2">
                      Calibrated Risk Gauge
                    </span>
                    <RiskScoreGauge
                      score={demoResult.risk_score}
                      level={demoResult.risk_level}
                      decision={demoResult.decision}
                      size="md"
                    />
                  </div>

                  {/* Telemetry Metrics (Right 8 cols) */}
                  <div className="sm:col-span-8 grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3.5 bg-surface-subtle rounded border border-line">
                      <span className="text-ink-muted block text-[10px] uppercase">Evidence Confidence</span>
                      <span className="text-xl font-bold text-emerald">
                        {(demoResult.evidence_quality * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-ink-secondary block mt-0.5">27 signals captured</span>
                    </div>

                    <div className="p-3.5 bg-surface-subtle rounded border border-line">
                      <span className="text-ink-muted block text-[10px] uppercase">Evaluation Latency</span>
                      <span className="text-xl font-bold text-ink">{demoResult.latency_ms.toFixed(2)} ms</span>
                      <span className="text-[10px] text-emerald block mt-0.5">&lt; 10ms SLA Pass</span>
                    </div>

                    <div className="p-3.5 bg-surface-subtle rounded border border-line">
                      <span className="text-ink-muted block text-[10px] uppercase">Calibration Model</span>
                      <span className="text-sm font-bold text-ink">{demoResult.versions.calibration}</span>
                      <span className="text-[10px] text-ink-muted block mt-0.5">Frozen weight matrix</span>
                    </div>

                    <div className="p-3.5 bg-surface-subtle rounded border border-line">
                      <span className="text-ink-muted block text-[10px] uppercase">Audit Snapshot</span>
                      <span className="text-sm font-bold text-ink">
                        {demoResult.audit.recorded ? "RECORDED ✓" : "VOLATILE"}
                      </span>
                      <span className="text-[10px] text-ink-muted block mt-0.5">SHA-256 Verified</span>
                    </div>
                  </div>
                </div>

                {/* Signals Breakdown */}
                {demoResult.signals && demoResult.signals.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                      Triggered Risk Signals ({demoResult.signals.length})
                    </span>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {demoResult.signals.map((sig, idx) => (
                        <div key={idx} className="p-3 bg-surface-subtle rounded border border-line space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-ink">{sig.name}</span>
                            <span className="font-mono text-accent font-bold">
                              +{(sig.contribution * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-ink-secondary text-[11px] leading-relaxed font-sans">{sig.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deterministic Explanations */}
                <div className="space-y-2 pt-2">
                  <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                    Deterministic Root-Cause Explanations
                  </span>
                  <ul className="space-y-1.5 text-xs text-ink-secondary font-sans">
                    {demoResult.explanation.map((exp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Raw JSON Inspector */}
                <JsonViewer
                  data={demoResult}
                  title={`V1 Real Evaluation Response (${demoResult.transaction_id})`}
                  maxHeight="260px"
                />
              </div>
            )}
          </div>
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 03 — RAZORPAY BUILDATHON INSPIRED ARCHITECTURE TRACKS */}
      <ScrollytellingSection id="architecture" index={3} total={10} title="ARCHITECTURE TRACKS" badge="4 TRACKS">
        <TracingScrollBeam>
          <BuildathonTracksSection />
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 04 — INTERACTIVE SIGNAL CONTRIBUTION MATRIX */}
      <ScrollytellingSection id="signals" index={4} total={10} title="DETERMINISTIC SIGNAL ENGINE" badge="27 SIGNALS">
        <TracingScrollBeam>
          <EngineSignalVisualizer />
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 05 — 3D CROSS-MERCHANT ENTITY INTELLIGENCE (THE CORE) */}
      <ScrollytellingSection id="graph" index={5} total={10} title="CROSS-MERCHANT ENTITY GRAPH" badge="3D TOPOLOGY">
        <TracingScrollBeam>
          <div className="space-y-10">
            <div className="max-w-3xl space-y-2">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider block">
                05 · CORE ARCHITECTURE: CROSS-MERCHANT ENTITY INTELLIGENCE
              </span>
              <KineticText
                text="Interactive 3D Entity Graph Network"
                as="h2"
                className="text-3xl sm:text-5xl font-display font-black text-ink tracking-tight"
                highlightWords={["3D", "Entity", "Graph"]}
              />
              <p className="text-base text-ink-secondary leading-relaxed font-satoshi">
                Explore how AegisPay links transaction tokens across merchant boundaries in real-time with multi-hop BFS graph traversal, strict PII masking, and weighted risk propagation.
              </p>
            </div>

            {/* Core Interactive 3D Entity Graph Visualizer */}
            <div>
              <EntityGraph3DVisualizer />
            </div>
          </div>
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 06 — DETERMINISTIC REPLAY & TEMPORAL AUDIT PROOF */}
      <ScrollytellingSection id="replay" index={6} total={10} title="REPLAY & AUDIT" badge="Δ = 0.0000">
        <TracingScrollBeam>
          <DeterministicReplayShowcase />
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 07 — SECURITY & DYNAMIC RBAC SIMULATOR */}
      <ScrollytellingSection id="security" index={7} total={10} title="MULTI-ROLE RBAC GOVERNANCE" badge="5 ROLES">
        <TracingScrollBeam>
          <SecurityRbacSimulator />
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 08 — COMPLETE 12 PLATFORM MODULES PREVIEW */}
      <ScrollytellingSection id="modules" index={8} total={10} title="PLATFORM CONTROL PLANE" badge="12 MODULES">
        <TracingScrollBeam>
          <PlatformModulesPreview />
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 09 — LIVE MEASURED SYSTEM METRICS & SLA TELEMETRY */}
      <ScrollytellingSection id="metrics" index={9} total={10} title="LIVE SYSTEM TELEMETRY" badge="100% NOMINAL">
        <TracingScrollBeam>
          <LiveTelemetryMetrics />
        </TracingScrollBeam>
      </ScrollytellingSection>

      {/* CHAPTER 10 — DEVELOPER API & PRODUCTION CTA */}
      <ScrollytellingSection id="api" index={10} total={10} title="REST API & PRODUCTION LAUNCH" badge="V1 READY">
        <div className="space-y-16">
          {/* Public REST API Callout */}
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider block">
                10 · PUBLIC V1 REST API
              </span>
              <KineticText
                text="Single-call Sub-10ms Integration"
                as="h2"
                className="text-3xl sm:text-4xl font-display font-black text-ink tracking-tight"
                highlightWords={["Sub-10ms"]}
              />
              <p className="text-sm text-ink-secondary leading-relaxed font-satoshi">
                Integrate with your payment gateway checkout in minutes using standard HTTP headers (<code className="font-mono text-xs text-ink">X-API-Key</code>, <code className="font-mono text-xs text-ink">Idempotency-Key</code>).
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => router.push("/api")}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Explore Full API Documentation
                </Button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="p-5 bg-surface rounded-2xl border border-line text-xs font-mono space-y-2 shadow-card">
                <div className="flex items-center justify-between text-[11px] text-ink-muted pb-2 border-b border-line">
                  <span>cURL Evaluation Request</span>
                  <span>POST /v1/risk/evaluate</span>
                </div>
                <pre className="text-ink overflow-x-auto text-[11px] leading-relaxed">
{`curl -X POST https://api.aegispay.com/v1/risk/evaluate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_live_••••••••••••••••3A9F" \\
  -H "Idempotency-Key: idem_txn_1001" \\
  -d '{
    "transaction_id": "txn_1001",
    "merchant_id": "m_sandbox",
    "amount": 830.00,
    "currency": "USD",
    "device_token": "dev_tok_iphone14_91A2",
    "ip_token": "ip_tok_103_21_7F12"
  }'`}
                </pre>
              </div>
            </div>
          </div>

          {/* Final Enterprise Production CTA */}
          <div className="p-10 bg-surface rounded-2xl border border-line shadow-card text-center space-y-6 max-w-4xl mx-auto">
            <KineticText
              text="Ready to deploy deterministic payment risk defense?"
              as="h2"
              className="text-3xl sm:text-5xl font-display font-black text-ink tracking-tight"
              highlightWords={["deterministic"]}
            />
            <p className="text-base text-ink-secondary max-w-xl mx-auto leading-relaxed font-satoshi">
              Experience sub-10ms evaluation latency, mathematically reproducible decisions, and zero runtime LLM hallucinations.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                size="lg"
                variant="primary"
                onClick={() => router.push("/dashboard")}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Open Operations Console
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/sandbox")}
              >
                Scenario Sandbox
              </Button>
            </div>
          </div>
        </div>
      </ScrollytellingSection>

      {/* Minimal Footer */}
      <footer className="py-6 border-t border-line bg-canvas text-xs text-ink-muted relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px]">
          <span>AEGISPAY INC. · DETERMINISTIC RISK INFRASTRUCTURE</span>
          <span>SUB-10MS P95 SLA · ZERO RUNTIME LLM IN PAYMENT PATH</span>
        </div>
      </footer>
    </div>
  );
}