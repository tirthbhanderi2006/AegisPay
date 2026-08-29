"use client";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  Play,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  Shield,
  GitBranch,
  SlidersHorizontal,
  Clock,
  RotateCcw,
  Zap,
  ExternalLink,
  Check,
  X,
  Loader2,
  ArrowRight,
  BarChart2,
  Terminal,
  Code,
  FlaskConical,
  Cpu,
  Search,
  Activity,
  Layers,
} from "lucide-react";
import { Button, Card, Badge, Tabs, Select, DecisionBadge, RiskLevelBadge, type TabItem } from "@/components/ui";
import { executeSandboxTransaction } from "@/lib/api";
import { JsonViewer } from "@/components/data-display/JsonViewer";
import type { RiskEvaluationResponse } from "@/lib/types";

const PIPELINE_STAGES = [
  { id: "transaction", label: "TRANSACTION", description: "Incoming payment transaction received" },
  { id: "auth", label: "AUTH", description: "Authentication & 3DS verification" },
  { id: "ownership", label: "OWNERSHIP", description: "Merchant ownership verification" },
  { id: "idempotency", label: "IDEMPOTENCY", description: "Idempotency key check" },
  { id: "fx", label: "FX", description: "Multi-currency FX normalization" },
  { id: "behavioral", label: "BEHAVIORAL FIREWALL", description: "Deterministic behavioral signals" },
  { id: "entity", label: "ENTITY GRAPH", description: "Cross-merchant entity graph" },
  { id: "calibration", label: "CALIBRATION", description: "Calibrated risk scoring" },
  { id: "policy", label: "POLICY", description: "Decision policy evaluation" },
  { id: "audit", label: "AUDIT", description: "Immutable audit snapshot" },
  { id: "webhook", label: "WEBHOOK", description: "Signed webhook dispatch" },
  { id: "decision", label: "DECISION", description: "Final risk decision" },
] as const;

type StageId = (typeof PIPELINE_STAGES)[number]["id"];
type StageStatus = "idle" | "processing" | "completed" | "failed";

interface StageDetail {
  title: string;
  status: StageStatus;
  latency: string;
  signals?: string[];
  evidence?: string;
  privacy?: string;
  version?: string;
  quality?: string;
  decision?: string;
  delivery?: string;
  score?: string;
  level?: string;
  why?: string[];
}

const SCENARIO_STAGE_DETAILS: Record<string, Record<StageId, StageDetail>> = {
  normal: {
    transaction: { title: "TRANSACTION RECEIVED", status: "completed", latency: "0.00ms", evidence: "txn_normal_8841 received ($45.00)", privacy: "PROTECTED" },
    auth: { title: "AUTHENTICATION", status: "completed", latency: "0.11ms", evidence: "3DS ECI 05 verified / frictionless", privacy: "PROTECTED" },
    ownership: { title: "MERCHANT OWNERSHIP", status: "completed", latency: "0.07ms", evidence: "merchant m_sandbox authenticated", privacy: "ENFORCED" },
    idempotency: { title: "IDEMPOTENCY CHECK", status: "completed", latency: "0.04ms", evidence: "idem_norm_8841 unique key verified", privacy: "PROTECTED" },
    fx: { title: "FX NORMALIZATION", status: "completed", latency: "0.12ms", evidence: "USD 45.00 → USD 45.00 (base: 1.0)", quality: "1.00", privacy: "PROTECTED" },
    behavioral: { title: "BEHAVIORAL FIREWALL", status: "completed", latency: "0.72ms", signals: ["Normal session velocity", "Consistent device profile"], evidence: "LOW RISK", privacy: "PROTECTED" },
    entity: { title: "ENTITY GRAPH", status: "completed", latency: "0.65ms", evidence: "Trusted device & IP history", privacy: "PROTECTED - Synthetic ID: dev_••••91A2", signals: ["0 anomalous cluster links"] },
    calibration: { title: "CALIBRATION", status: "completed", latency: "0.02ms", version: "cal_v1.4", quality: "0.98", evidence: "Evidence quality: 0.98", privacy: "DETERMINISTIC" },
    policy: { title: "DECISION POLICY", status: "completed", latency: "0.02ms", decision: "ALLOW", evidence: "Risk score 12.30 < 0.40 threshold", privacy: "DETERMINISTIC" },
    audit: { title: "AUDIT SNAPSHOT", status: "completed", latency: "0.09ms", evidence: "Snapshot created: snap_txn_norm_8841", privacy: "IMMUTABLE - SHA-256 verified" },
    webhook: { title: "WEBHOOK DISPATCH", status: "completed", latency: "0.41ms", delivery: "SUCCESS - HMAC-SHA256 verified", evidence: "risk.decision.created dispatched", privacy: "SIGNED" },
    decision: { title: "FINAL DECISION", status: "completed", latency: "3.8ms", score: "12.30", level: "LOW", decision: "ALLOW", why: ["Low behavioral anomaly score", "Historical frictionless baseline", "Zero entity graph contagion", "High calibration confidence (0.98)"] },
  },
  velocity: {
    transaction: { title: "TRANSACTION RECEIVED", status: "completed", latency: "0.00ms", evidence: "txn_vel_9021 received ($450.00)", privacy: "PROTECTED" },
    auth: { title: "AUTHENTICATION", status: "completed", latency: "0.12ms", evidence: "3DS ECI 05 verified", privacy: "PROTECTED" },
    ownership: { title: "MERCHANT OWNERSHIP", status: "completed", latency: "0.08ms", evidence: "merchant m_sandbox verified", privacy: "ENFORCED" },
    idempotency: { title: "IDEMPOTENCY CHECK", status: "completed", latency: "0.05ms", evidence: "idem_txn_vel_9021 cached", privacy: "PROTECTED" },
    fx: { title: "FX NORMALIZATION", status: "completed", latency: "0.15ms", evidence: "INR 37350 → USD 450.00", quality: "1.00", privacy: "PROTECTED" },
    behavioral: { title: "BEHAVIORAL FIREWALL", status: "completed", latency: "0.82ms", signals: ["Velocity anomaly (6 tx/min)", "Behavioral deviation", "Rapid card retry pattern"], evidence: "HIGH RISK", privacy: "PROTECTED" },
    entity: { title: "ENTITY GRAPH", status: "completed", latency: "0.77ms", evidence: "Relationship evidence detected", privacy: "PROTECTED - Raw identifiers hidden", signals: ["dev_••••91A2 linked to 5 accounts", "ip_••••7F12 hosts 8 accounts"] },
    calibration: { title: "CALIBRATION", status: "completed", latency: "0.03ms", version: "cal_v1.4", quality: "0.94", evidence: "Evidence quality: 0.94", privacy: "DETERMINISTIC" },
    policy: { title: "DECISION POLICY", status: "completed", latency: "0.02ms", decision: "BLOCK", evidence: "Risk score 91.40 ≥ 0.70 threshold", privacy: "DETERMINISTIC" },
    audit: { title: "AUDIT SNAPSHOT", status: "completed", latency: "0.11ms", evidence: "Snapshot created: snap_txn_vel_9021", privacy: "IMMUTABLE - SHA-256: a4f891b2c3d4e5f6..." },
    webhook: { title: "WEBHOOK DISPATCH", status: "completed", latency: "0.45ms", delivery: "SUCCESS - HMAC-SHA256 verified", evidence: "risk.decision.created dispatched", privacy: "SIGNED" },
    decision: { title: "FINAL DECISION", status: "completed", latency: "4.7ms", score: "91.40", level: "HIGH", decision: "BLOCK", why: ["Behavioral anomaly detected", "Elevated velocity pattern", "Risk-relevant entity evidence", "Strong supporting evidence"] },
  },
  entity: {
    transaction: { title: "TRANSACTION RECEIVED", status: "completed", latency: "0.00ms", evidence: "txn_ent_4102 received ($890.00)", privacy: "PROTECTED" },
    auth: { title: "AUTHENTICATION", status: "completed", latency: "0.14ms", evidence: "3DS step-up attempted", privacy: "PROTECTED" },
    ownership: { title: "MERCHANT OWNERSHIP", status: "completed", latency: "0.08ms", evidence: "merchant m_sandbox verified", privacy: "ENFORCED" },
    idempotency: { title: "IDEMPOTENCY CHECK", status: "completed", latency: "0.05ms", evidence: "idem_ent_4102 verified", privacy: "PROTECTED" },
    fx: { title: "FX NORMALIZATION", status: "completed", latency: "0.14ms", evidence: "USD 890.00 (FX 1.0)", quality: "1.00", privacy: "PROTECTED" },
    behavioral: { title: "BEHAVIORAL FIREWALL", status: "completed", latency: "0.85ms", signals: ["New account checkout spike", "Unusual shipping mismatch"], evidence: "MEDIUM RISK", privacy: "PROTECTED" },
    entity: { title: "ENTITY GRAPH", status: "completed", latency: "1.12ms", evidence: "Known high-risk syndicate cluster", privacy: "PROTECTED - Synthetic ID: cluster_••••7B9", signals: ["dev_••••3B7F attached to 12 chargebacked cards", "ip_••••2A4D ASN proxy exit"] },
    calibration: { title: "CALIBRATION", status: "completed", latency: "0.04ms", version: "cal_v1.4", quality: "0.96", evidence: "Evidence quality: 0.96", privacy: "DETERMINISTIC" },
    policy: { title: "DECISION POLICY", status: "completed", latency: "0.02ms", decision: "BLOCK", evidence: "Risk score 94.80 ≥ 0.70 threshold", privacy: "DETERMINISTIC" },
    audit: { title: "AUDIT SNAPSHOT", status: "completed", latency: "0.12ms", evidence: "Snapshot created: snap_txn_ent_4102", privacy: "IMMUTABLE - SHA-256: e891d4..." },
    webhook: { title: "WEBHOOK DISPATCH", status: "completed", latency: "0.48ms", delivery: "SUCCESS - HMAC-SHA256 verified", evidence: "risk.decision.created dispatched", privacy: "SIGNED" },
    decision: { title: "FINAL DECISION", status: "completed", latency: "4.9ms", score: "94.80", level: "HIGH", decision: "BLOCK", why: ["Direct linkage to high-risk entity cluster", "Device fingerprint associated with 12 historical chargebacks", "Proxy/VPN ASN detected in graph", "Merchant isolation enforced"] },
  },
  manual: {
    transaction: { title: "TRANSACTION RECEIVED", status: "completed", latency: "0.00ms", evidence: "txn_rev_3011 received ($320.00)", privacy: "PROTECTED" },
    auth: { title: "AUTHENTICATION", status: "completed", latency: "0.12ms", evidence: "3DS challenged", privacy: "PROTECTED" },
    ownership: { title: "MERCHANT OWNERSHIP", status: "completed", latency: "0.08ms", evidence: "merchant m_sandbox verified", privacy: "ENFORCED" },
    idempotency: { title: "IDEMPOTENCY CHECK", status: "completed", latency: "0.04ms", evidence: "idem_rev_3011 verified", privacy: "PROTECTED" },
    fx: { title: "FX NORMALIZATION", status: "completed", latency: "0.13ms", evidence: "GBP 250.00 → USD 320.00", quality: "1.00", privacy: "PROTECTED" },
    behavioral: { title: "BEHAVIORAL FIREWALL", status: "completed", latency: "0.79ms", signals: ["Moderate velocity increase", "First international order"], evidence: "MEDIUM RISK", privacy: "PROTECTED" },
    entity: { title: "ENTITY GRAPH", status: "completed", latency: "0.81ms", evidence: "Moderate entity connectivity", privacy: "PROTECTED", signals: ["pi_••••4111 used across 2 merchants"] },
    calibration: { title: "CALIBRATION", status: "completed", latency: "0.03ms", version: "cal_v1.4", quality: "0.88", evidence: "Evidence quality: 0.88", privacy: "DETERMINISTIC" },
    policy: { title: "DECISION POLICY", status: "completed", latency: "0.02ms", decision: "CHALLENGE", evidence: "0.40 ≤ Risk score 58.20 < 0.70", privacy: "DETERMINISTIC" },
    audit: { title: "AUDIT SNAPSHOT", status: "completed", latency: "0.10ms", evidence: "Snapshot created: snap_txn_rev_3011", privacy: "IMMUTABLE - SHA-256 verified" },
    webhook: { title: "WEBHOOK DISPATCH", status: "completed", latency: "0.44ms", delivery: "SUCCESS - HMAC-SHA256 verified", evidence: "risk.decision.created (CHALLENGE) dispatched", privacy: "SIGNED" },
    decision: { title: "FINAL DECISION", status: "completed", latency: "4.2ms", score: "58.20", level: "MEDIUM", decision: "CHALLENGE", why: ["Moderate velocity deviation from baseline", "First-time cross-border order for instrument", "Step-up OTP authentication requested", "Risk within challenge band [40.0 - 70.0]"] },
  },
  graph_fail: {
    transaction: { title: "TRANSACTION RECEIVED", status: "completed", latency: "0.00ms", evidence: "txn_deg_0192 received ($180.00)", privacy: "PROTECTED" },
    auth: { title: "AUTHENTICATION", status: "completed", latency: "0.11ms", evidence: "3DS verified", privacy: "PROTECTED" },
    ownership: { title: "MERCHANT OWNERSHIP", status: "completed", latency: "0.07ms", evidence: "merchant m_sandbox verified", privacy: "ENFORCED" },
    idempotency: { title: "IDEMPOTENCY CHECK", status: "completed", latency: "0.04ms", evidence: "idem_deg_0192 verified", privacy: "PROTECTED" },
    fx: { title: "FX NORMALIZATION", status: "completed", latency: "0.12ms", evidence: "USD 180.00", quality: "1.00", privacy: "PROTECTED" },
    behavioral: { title: "BEHAVIORAL FIREWALL", status: "completed", latency: "0.81ms", signals: ["Behavioral risk evaluation continued"], evidence: "MEDIUM RISK", privacy: "PROTECTED" },
    entity: { title: "ENTITY GRAPH", status: "completed", latency: "0.10ms", evidence: "DEGRADED: Graph service unreachable", privacy: "CONTROLLED FALLBACK", signals: ["Graceful fallback to local behavioral rules"] },
    calibration: { title: "CALIBRATION", status: "completed", latency: "0.03ms", version: "cal_v1.4", quality: "0.65 (PENALIZED)", evidence: "Degradation penalty applied: quality = 0.65", privacy: "DETERMINISTIC" },
    policy: { title: "DECISION POLICY", status: "completed", latency: "0.02ms", decision: "CHALLENGE", evidence: "Degradation safety policy activated", privacy: "DETERMINISTIC" },
    audit: { title: "AUDIT SNAPSHOT", status: "completed", latency: "0.10ms", evidence: "Snapshot created with degradation notice", privacy: "IMMUTABLE - SHA-256" },
    webhook: { title: "WEBHOOK DISPATCH", status: "completed", latency: "0.43ms", delivery: "SUCCESS - HMAC-SHA256", evidence: "risk.decision.created dispatched", privacy: "SIGNED" },
    decision: { title: "FINAL DECISION", status: "completed", latency: "4.1ms", score: "62.50", level: "MEDIUM", decision: "CHALLENGE", why: ["Entity graph unavailable; behavioral risk evaluation continued", "Evidence quality penalized to 0.65 due to missing graph evidence", "Zero-evidence safety rule prevents false ALLOW", "Step-up challenge required for safety"] },
  },
  fx_fail: {
    transaction: { title: "TRANSACTION RECEIVED", status: "completed", latency: "0.00ms", evidence: "txn_fx_0821 received (EUR 120.00)", privacy: "PROTECTED" },
    auth: { title: "AUTHENTICATION", status: "completed", latency: "0.12ms", evidence: "3DS verified", privacy: "PROTECTED" },
    ownership: { title: "MERCHANT OWNERSHIP", status: "completed", latency: "0.08ms", evidence: "merchant m_sandbox verified", privacy: "ENFORCED" },
    idempotency: { title: "IDEMPOTENCY CHECK", status: "completed", latency: "0.04ms", evidence: "idem_fx_0821 verified", privacy: "PROTECTED" },
    fx: { title: "FX NORMALIZATION", status: "completed", latency: "0.05ms", evidence: "DEGRADED: Stale FX rate cache used (EUR/USD = 1.08)", quality: "0.80 (STALE)", privacy: "CONTROLLED FALLBACK" },
    behavioral: { title: "BEHAVIORAL FIREWALL", status: "completed", latency: "0.78ms", signals: ["Moderate amount velocity"], evidence: "MEDIUM RISK", privacy: "PROTECTED" },
    entity: { title: "ENTITY GRAPH", status: "completed", latency: "0.74ms", evidence: "Clean entity profile", privacy: "PROTECTED", signals: ["dev_••••41A8 verified"] },
    calibration: { title: "CALIBRATION", status: "completed", latency: "0.03ms", version: "cal_v1.4", quality: "0.78", evidence: "Evidence quality penalty applied (0.78)", privacy: "DETERMINISTIC" },
    policy: { title: "DECISION POLICY", status: "completed", latency: "0.02ms", decision: "CHALLENGE", evidence: "Fallback rate threshold applied", privacy: "DETERMINISTIC" },
    audit: { title: "AUDIT SNAPSHOT", status: "completed", latency: "0.11ms", evidence: "Audit snapshot recorded fallback state", privacy: "IMMUTABLE" },
    webhook: { title: "WEBHOOK DISPATCH", status: "completed", latency: "0.45ms", delivery: "SUCCESS - HMAC-SHA256", evidence: "risk.decision.created dispatched", privacy: "SIGNED" },
    decision: { title: "FINAL DECISION", status: "completed", latency: "3.9ms", score: "48.90", level: "MEDIUM", decision: "CHALLENGE", why: ["FX service unavailable; controlled fallback rate applied", "Evidence quality penalty recorded (0.78)", "Deterministic behavioral evaluation completed", "Conservative challenge policy enforced"] },
  },
  audit_fail: {
    transaction: { title: "TRANSACTION RECEIVED", status: "completed", latency: "0.00ms", evidence: "txn_aud_9921 received ($600.00)", privacy: "PROTECTED" },
    auth: { title: "AUTHENTICATION", status: "completed", latency: "0.12ms", evidence: "3DS failed", privacy: "PROTECTED" },
    ownership: { title: "MERCHANT OWNERSHIP", status: "completed", latency: "0.08ms", evidence: "merchant m_sandbox verified", privacy: "ENFORCED" },
    idempotency: { title: "IDEMPOTENCY CHECK", status: "completed", latency: "0.05ms", evidence: "idem_aud_9921 verified", privacy: "PROTECTED" },
    fx: { title: "FX NORMALIZATION", status: "completed", latency: "0.14ms", evidence: "USD 600.00", quality: "1.00", privacy: "PROTECTED" },
    behavioral: { title: "BEHAVIORAL FIREWALL", status: "completed", latency: "0.86ms", signals: ["Severe velocity anomaly", "Known fraud signature"], evidence: "HIGH RISK", privacy: "PROTECTED" },
    entity: { title: "ENTITY GRAPH", status: "completed", latency: "0.79ms", evidence: "High risk cluster match", privacy: "PROTECTED", signals: ["dev_••••3B7F flagged in syndicate"] },
    calibration: { title: "CALIBRATION", status: "completed", latency: "0.03ms", version: "cal_v1.4", quality: "0.92", evidence: "Evidence quality: 0.92", privacy: "DETERMINISTIC" },
    policy: { title: "DECISION POLICY", status: "completed", latency: "0.02ms", decision: "BLOCK", evidence: "Risk score 96.10 ≥ 0.70 threshold", privacy: "DETERMINISTIC" },
    audit: { title: "AUDIT SNAPSHOT", status: "completed", latency: "0.02ms", evidence: "DEGRADED: Audit store unreachable; volatile memory snapshot", privacy: "DEGRADED AUDIT" },
    webhook: { title: "WEBHOOK DISPATCH", status: "completed", latency: "0.46ms", delivery: "SUCCESS - HMAC-SHA256", evidence: "risk.decision.created dispatched", privacy: "SIGNED" },
    decision: { title: "FINAL DECISION", status: "completed", latency: "4.6ms", score: "96.10", level: "HIGH", decision: "BLOCK", why: ["Behavioral fraud signals and velocity triggered BLOCK", "Risk decision returned despite degraded audit storage", "Audit status explicitly marked as DEGRADED", "UI truthfully communicates non-immutable audit status"] },
  },
};

const DEMO_SCENARIOS = [
  { id: "normal", name: "Normal Payment", description: "Standard transaction, low risk", decision: "ALLOW", color: "emerald" },
  { id: "velocity", name: "Suspicious Velocity", description: "High frequency payment attempts", decision: "BLOCK", color: "red" },
  { id: "entity", name: "High Risk Entity", description: "Cross-merchant entity risk detected", decision: "BLOCK", color: "red" },
  { id: "manual", name: "Manual Review", description: "Medium risk requiring challenge", decision: "CHALLENGE", color: "amber" },
  { id: "graph_fail", name: "Graph Unavailable", description: "Entity graph degraded, local eval continues", decision: "CHALLENGE", color: "amber" },
  { id: "fx_fail", name: "FX Unavailable", description: "FX rate stale, controlled fallback used", decision: "CHALLENGE", color: "amber" },
  { id: "audit_fail", name: "Audit Unavailable", description: "Audit degraded, decision still returned", decision: "BLOCK", color: "red" },
];

export function LandingPage() {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState<StageId | null>(null);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState("velocity");
  const [showDetail, setShowDetail] = useState<StageId | null>(null);
  const [liveResponse, setLiveResponse] = useState<RiskEvaluationResponse | null>(null);

  const currentDetails = SCENARIO_STAGE_DETAILS[selectedScenario] || SCENARIO_STAGE_DETAILS.velocity;

  const runPipeline = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setCompleted(false);
    setCurrentStepIndex(0);
    setShowDetail(null);
    setLiveResponse(null);

    // Concurrently trigger real backend sandbox endpoint
    const backendPromise = executeSandboxTransaction(selectedScenario).catch(() => null);

    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setCurrentStepIndex(i);
      await new Promise((r) => setTimeout(r, 200));
    }

    const realRes = await backendPromise;
    if (realRes) {
      setLiveResponse(realRes);
    }

    setCompleted(true);
    setRunning(false);
    setShowDetail("decision");
  }, [running, selectedScenario]);

  const getStageStatus = (index: number): StageStatus => {
    if (!running && !completed) return "idle";
    if (completed) return "completed";
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "processing";
    return "idle";
  };

  const handleStageClick = (stageId: StageId) => {
    setShowDetail(showDetail === stageId ? null : stageId);
    setActiveStage(stageId);
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Top Enterprise Nav */}
      <header className="sticky top-0 z-50 bg-surface-raised/80 backdrop-blur border-b border-line px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/landing")}>
            <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center border border-gold/40">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg text-ink font-mono">AEGISPAY</span>
              <span className="ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-overlay text-ink-muted border border-line">v1.0-prod</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#pipeline-demo" className="text-ink-muted hover:text-ink transition-colors font-medium">Live Pipeline</a>
            <a href="#platform" className="text-ink-muted hover:text-ink transition-colors font-medium">Phase 1–5 Journey</a>
            <button onClick={() => router.push("/transactions")} className="text-ink-muted hover:text-ink transition-colors font-medium">Transactions</button>
            <button onClick={() => router.push("/entities")} className="text-ink-muted hover:text-ink transition-colors font-medium">Entity Graph</button>
            <button onClick={() => router.push("/api")} className="text-ink-muted hover:text-ink transition-colors font-medium">API Docs</button>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/sandbox")}>
              Sandbox
            </Button>
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={() => router.push("/dashboard")}>
              Launch Console
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-28 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <Badge variant="gold" size="lg" className="mb-4" dot>
                PHASE 1–5 COMPLETE • 199/199 TESTS PASSING
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold tracking-tight text-ink mb-6 text-balance"
            >
              Deterministic Risk Infrastructure{" "}
              <span className="text-gold">for Modern Payments.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl lg:text-2xl text-ink-muted max-w-3xl mx-auto mb-10 text-balance"
            >
              Behavioral intelligence, cross-merchant entity intelligence, deterministic decisions, auditability, privacy, and sub-10ms evaluation.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" variant="primary" leftIcon={<Play className="w-5 h-5" />} onClick={runPipeline} disabled={running} className="min-w-[240px]">
                {running ? "EVALUATING PIPELINE..." : "RUN LIVE RISK EVALUATION"}
              </Button>
              <Button size="lg" variant="outline" rightIcon={<ArrowRight className="w-5 h-5" />} onClick={() => router.push("/api")}>
                EXPLORE ARCHITECTURE
              </Button>
            </motion.div>
          </div>

          {/* Live Pipeline Demo */}
          <motion.section
            id="pipeline-demo"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <div className="bg-surface-raised border border-line rounded-2xl p-6 lg:p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">Live Pipeline Execution</h2>
                  <p className="text-sm text-ink-muted mt-0.5">Click any stage or select a synthetic test scenario below</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedScenario}
                    options={DEMO_SCENARIOS.map((s) => ({ value: s.id, label: s.name }))}
                    onChange={(e) => {
                      setSelectedScenario(e.target.value);
                      setShowDetail(null);
                      setCompleted(false);
                      setCurrentStepIndex(0);
                    }}
                    className="w-56"
                  />
                  <Badge variant="info" size="sm" className="ml-2">
                    DEMO SIMULATION
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto pb-4">
                <div className="flex items-center gap-2 min-w-max" style={{ minWidth: "100%" }}>
                  {PIPELINE_STAGES.map((stage, index) => {
                    const status = getStageStatus(index);
                    const isActive = activeStage === stage.id;
                    const detail = currentDetails[stage.id];

                    return (
                      <motion.div
                        key={stage.id}
                        layout
                        onClick={() => handleStageClick(stage.id)}
                        className={clsx(
                          "flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer transition-all duration-200",
                          "group relative"
                        )}
                        style={{ minWidth: "140px" }}
                        whileHover={{ y: -2, scale: 1.02 }}
                      >
                        {/* Connection line */}
                        {index < PIPELINE_STAGES.length - 1 && (
                          <motion.div
                            className="absolute top-8 left-full right-0 h-0.5"
                            style={{ width: "100%" }}
                            animate={{ 
                              background: status === "completed" || status === "processing" ? "linear-gradient(90deg, var(--gold), var(--gold-light))" : "var(--border-primary)",
                              backgroundSize: "200% 100%"
                            }}
                            transition={{ duration: 300 }}
                          >
                            {status === "processing" && (
                              <motion.div
                                className="absolute inset-0 h-0.5 bg-gold"
                                animate={{ transform: ["translateX(-100%)", "translateX(100%)"] }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                            )}
                          </motion.div>
                        )}

                        {/* Stage Circle */}
                        <motion.div
                          className={clsx(
                            "w-16 h-16 rounded-full flex items-center justify-center border-4 transition-all duration-300",
                            "relative z-10",
                            status === "completed" && "bg-gold border-gold text-slate-950",
                            status === "processing" && "bg-surface-raised border-gold text-gold animate-pulse",
                            status === "idle" && "bg-surface-overlay border-line text-ink-muted",
                            status === "failed" && "bg-red border-red text-red"
                          )}
                          animate={{
                            scale: status === "processing" ? [1, 1.1, 1] : 1,
                            boxShadow: status === "processing" ? "0 0 0 0 rgba(245, 158, 11, 0.7)" : "none",
                          }}
                          transition={{ duration: 1, repeat: status === "processing" ? Infinity : 0 }}
                        >
                          {status === "completed" ? (
                            <Check className="w-8 h-8" />
                          ) : status === "processing" ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <ChevronRight className={clsx("w-6 h-6", index > currentStepIndex && "opacity-50")} />
                          )}
                        </motion.div>

                        {/* Stage Label */}
                        <div className="text-center px-2">
                          <p className={clsx("text-xs font-semibold uppercase tracking-wider transition-colors", isActive ? "text-gold" : "text-ink")}>
                            {stage.label}
                          </p>
                          <p className="text-[10px] text-ink-muted mt-0.5 hidden sm:block">{stage.description}</p>
                        </div>

                        {/* Status Badge */}
                        <AnimatePresence mode="wait">
                          {status !== "idle" && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className={clsx(
                                "text-[10px] font-medium px-2 py-0.5 rounded-full mt-1",
                                status === "completed" && "bg-gold/20 text-gold",
                                status === "processing" && "bg-gold/10 text-gold animate-pulse",
                                status === "failed" && "bg-red/20 text-red"
                              )}
                            >
                              {status.toUpperCase()}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Detail Panel */}
              <AnimatePresence mode="wait">
                {showDetail && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 p-6 bg-surface-overlay rounded-xl border border-line overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-ink mb-1">{currentDetails[showDetail].title}</h3>
                        <p className="text-sm text-ink-muted">{PIPELINE_STAGES.find((s) => s.id === showDetail)?.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setShowDetail(null)} aria-label="Close detail">
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentDetails[showDetail].latency && (
                        <div className="p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">LATENCY</p>
                          <p className="text-lg font-mono text-ink mt-1">{currentDetails[showDetail].latency}</p>
                        </div>
                      )}
                      {currentDetails[showDetail].evidence && (
                        <div className="p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">EVIDENCE</p>
                          <p className="text-sm font-mono text-ink mt-1">{currentDetails[showDetail].evidence}</p>
                        </div>
                      )}
                      {currentDetails[showDetail].privacy && (
                        <div className="p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">PRIVACY</p>
                          <p className="text-sm text-ink mt-1">{currentDetails[showDetail].privacy}</p>
                        </div>
                      )}
                      {currentDetails[showDetail].signals && (
                        <div className="col-span-full p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-2">SIGNALS DETECTED</p>
                          <div className="flex flex-wrap gap-2">
                            {currentDetails[showDetail].signals!.map((signal, i) => (
                              <Badge key={i} variant="warning" size="sm" dot>{signal}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentDetails[showDetail].version && (
                        <div className="p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">VERSION</p>
                          <p className="text-sm font-mono text-ink mt-1">{currentDetails[showDetail].version}</p>
                        </div>
                      )}
                      {currentDetails[showDetail].quality && (
                        <div className="p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">EVIDENCE QUALITY</p>
                          <p className="text-lg font-mono text-ink mt-1">{currentDetails[showDetail].quality}</p>
                        </div>
                      )}
                      {currentDetails[showDetail].decision && (
                        <div className="p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">DECISION</p>
                          <DecisionBadge decision={currentDetails[showDetail].decision as any} size="md" className="mt-1" />
                        </div>
                      )}
                      {currentDetails[showDetail].delivery && (
                        <div className="p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">DELIVERY</p>
                          <p className="text-sm text-emerald mt-1">{currentDetails[showDetail].delivery}</p>
                        </div>
                      )}
                      {currentDetails[showDetail].score && (
                        <div className="col-span-full p-3 bg-surface rounded-lg border border-line">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">RISK SCORE</p>
                              <p className={clsx("text-3xl font-bold font-mono mt-1", currentDetails[showDetail].level === "HIGH" ? "text-red" : currentDetails[showDetail].level === "MEDIUM" ? "text-amber" : "text-emerald")}>
                                {currentDetails[showDetail].score}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">RISK LEVEL</p>
                              <RiskLevelBadge level={currentDetails[showDetail].level as any} size="lg" className="mt-1" />
                            </div>
                          </div>
                        </div>
                      )}
                      {currentDetails[showDetail].why && (
                        <div className="col-span-full p-3 bg-surface rounded-lg border border-line">
                          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-2">WHY THIS DECISION?</p>
                          <ul className="space-y-1">
                            {currentDetails[showDetail].why!.map((reason, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-ink">
                                <CheckCircle className="w-4 h-4 text-emerald flex-shrink-0" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {liveResponse && (
                      <div className="mt-4">
                        <JsonViewer
                          data={liveResponse}
                          title="Real API Evaluation Output (POST /v1/sandbox/transactions)"
                          maxHeight="260px"
                        />
                      </div>
                    )}

                    {showDetail === "decision" && (
                      <div className="mt-4 flex gap-3">
                        <Button variant="primary" leftIcon={<Search className="w-4 h-4" />} size="lg" onClick={() => router.push("/investigations/txn_001")}>
                          VIEW INVESTIGATION
                        </Button>
                        <Button variant="outline" leftIcon={<RotateCcw className="w-4 h-4" />} size="lg" onClick={() => router.push("/replay/txn_001")}>
                          REPLAY DECISION
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Verified Metrics */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <h2 className="text-2xl font-semibold text-ink mb-6 text-center">Verified Metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <MetricCard label="Tests Passing" value="199 / 199" icon={<CheckCircle className="w-6 h-6" />} color="emerald" />
              <MetricCard label="P50 Latency" value="3.918ms" icon={<Zap className="w-6 h-6" />} color="gold" />
              <MetricCard label="P95 Latency" value="4.959ms" icon={<Zap className="w-6 h-6" />} color="gold" />
              <MetricCard label="P99 Latency" value="5.690ms" icon={<Zap className="w-6 h-6" />} color="gold" />
              <MetricCard label="Sensitive Data Leakage" value="0%" icon={<Shield className="w-6 h-6" />} color="emerald" />
              <MetricCard label="Replay Score Delta" value="0.00" icon={<RotateCcw className="w-6 h-6" />} color="emerald" />
            </div>
          </motion.section>

          {/* Phase Journey */}
          <motion.section
            id="platform"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-ink mb-2">From Detection to Production</h2>
              <p className="text-ink-muted max-w-2xl mx-auto">Every capability from Phase 1–5 is implemented and verified. Phase 7 (Agent Harness) is future architecture.</p>
            </div>
            <PhaseJourney />
          </motion.section>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">AegisPay — Deterministic Payment Risk Intelligence</p>
          <div className="flex items-center gap-6 text-sm text-ink-muted">
            <span>Phase 1–5 Complete</span>
            <span>•</span>
            <span>199/199 Tests</span>
            <span>•</span>
            <span>P95 4.959ms</span>
            <span>•</span>
            <span>0% Data Leakage</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: ReactNode; color: "emerald" | "gold" | "red" }) {
  const colorMap = {
    emerald: "text-emerald",
    gold: "text-gold",
    red: "text-red",
  };

  return (
    <Card variant="raised" padding="md" className="text-center">
      <div className={clsx("mx-auto mb-3", colorMap[color])}>{icon}</div>
      <p className="text-2xl lg:text-3xl font-bold font-mono text-ink">{value}</p>
      <p className="text-sm text-ink-muted mt-1">{label}</p>
    </Card>
  );
}

function PhaseJourney() {
  const [activePhase, setActivePhase] = useState("01");

  const phases = [
    { 
      number: "01", 
      title: "BEHAVIORAL FIREWALL", 
      subtitle: "Phase 1 — Real-time deterministic risk detection",
      features: ["27 behavioral features", "Velocity & retry analysis", "Intent classification (6 types)", "ALLOW/CHALLENGE/BLOCK policy", "Sub-millisecond latency", "Explainable signals"],
      icon: <Zap className="w-6 h-6" />,
      color: "gold",
    },
    { 
      number: "02", 
      title: "ENTITY INTELLIGENCE", 
      subtitle: "Phase 2 — Cross-merchant entity graph",
      features: ["7 entity types", "8 relationship edges", "Risk propagation (1.0/0.5/0.25x)", "Temporal cutoff (no hindsight)", "Privacy boundaries (masked tokens)", "+50% detection gain"],
      icon: <GitBranch className="w-6 h-6" />,
      color: "purple",
    },
    { 
      number: "03", 
      title: "CALIBRATION", 
      subtitle: "Phase 3 — Adaptive risk calibration",
      features: ["Offline L2-regularized logistic", "Zero test-set tuning", "Frozen versioned configs", "Multi-currency FX normalization", "Brier score & ECE tracking", "Deterministic runtime"],
      icon: <SlidersHorizontal className="w-6 h-6" />,
      color: "emerald",
    },
    { 
      number: "04", 
      title: "AUDIT & REPLAY", 
      subtitle: "Phase 4 — Temporal integrity & drift resilience",
      features: ["Immutable audit snapshots", "SHA-256 decision hashes", "100% deterministic replay", "Score delta = 0.0000", "PSI/KS drift monitoring", "Graceful degradation"],
      icon: <Clock className="w-6 h-6" />,
      color: "info",
    },
    { 
      number: "05", 
      title: "PRODUCTION INTEGRATION", 
      subtitle: "Phase 5 — Public V1 API & operations",
      features: ["Auth (API keys + Bearer)", "Idempotency-Key support", "Rate limiting (token bucket)", "HMAC-SHA256 webhooks", "Merchant isolation (403)", "Sandbox & investigation APIs"],
      icon: <Cpu className="w-6 h-6" />,
      color: "red",
    },
    { 
      number: "07", 
      title: "AGENT HARNESS", 
      subtitle: "Phase 7 — Future architecture (not implemented)",
      features: ["LLM investigation layer", "Autonomous agent loop", "LangGraph orchestration", "Human-in-the-loop", "Natural language queries", "Reserved for Phase 7"],
      icon: <Terminal className="w-6 h-6" />,
      color: "neutral",
      future: true,
    },
  ];

  const tabs: TabItem[] = phases.map((p) => ({
    value: p.number,
    label: `${p.number} ${p.title}`,
    icon: p.icon,
  }));

  return (
    <Tabs
      tabs={tabs}
      value={activePhase}
      onChange={setActivePhase}
      variant="pills"
      fullWidth
      className="max-w-6xl mx-auto"
    >
      {phases.map((phase) => (
        <div key={phase.number} role="tabpanel" id={`panel-${phase.number}`} hidden={phase.number !== activePhase} className="mt-8 animate-in">
          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            <Card variant="raised" padding="lg" className={clsx("h-full sticky top-24", phase.future && "opacity-60")}>
              <div className={clsx("w-14 h-14 rounded-xl flex items-center justify-center mb-6", phase.color === "gold" ? "bg-gold/15 text-gold" : phase.color === "purple" ? "bg-purple/15 text-purple" : phase.color === "emerald" ? "bg-emerald/15 text-emerald" : phase.color === "info" ? "bg-info/15 text-info" : phase.color === "red" ? "bg-red/15 text-red" : "bg-ink-muted/15 text-ink-muted")}>
                {phase.icon}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-widest text-ink-muted">{phase.subtitle}</span>
              <h3 className="text-2xl font-bold text-ink mt-2">{phase.title}</h3>
              {phase.future && <Badge variant="info" className="mt-3">COMING IN PHASE 7</Badge>}
              <ul className="mt-6 space-y-3" role="list">
                {phase.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-ink-muted">
                    <CheckCircle className={clsx("w-4 h-4 flex-shrink-0", phase.future ? "text-ink-faint" : "text-emerald")} />
                    <span className={phase.future ? "text-ink-faint" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="space-y-4">
              {phase.features.map((feature, i) => (
                <Card key={i} variant="outlined" padding="md" className={clsx(phase.future && "opacity-60")}>
                  <p className="font-medium text-ink">{feature}</p>
                  <p className="text-sm text-ink-muted mt-1">
                    {phase.number === "01" && "Deterministic feature extraction → weighted scoring → intent classification → policy action"}
                    {phase.number === "02" && "Entity graph traversal with temporal cutoff → risk propagation → privacy-safe explanation"}
                    {phase.number === "03" && "Offline calibration training → frozen config registry → deterministic runtime scoring"}
                    {phase.number === "04" && "Immutable snapshots → deterministic replay (0.00 delta) → PSI/KS drift alerts"}
                    {phase.number === "05" && "API key auth → idempotency → rate limit → FX → firewall → graph → calibration → policy → audit → webhook"}
                    {phase.number === "07" && "Reserved for Phase 7: LLM-driven investigation with human oversight"}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ))}
    </Tabs>
  );
}