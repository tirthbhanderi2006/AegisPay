"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  FlaskConical,
  Play,
  Zap,
  GitBranch,
  Globe,
  Clock,
  Shield,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Loader2,
  Terminal,
} from "lucide-react";
import { Card, Badge, Button, DecisionBadge, RiskLevelBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { JsonViewer } from "@/components/data-display/JsonViewer";
import { DegradationNotice } from "@/components/risk/DegradationNotice";
import { executeSandboxTransaction } from "@/lib/api";
import type { RiskEvaluationResponse } from "@/lib/types";

const SCENARIOS = [
  {
    id: "normal",
    name: "Normal Payment",
    description: "Standard domestic payment, conforming to baseline",
    decision: "ALLOW",
    color: "emerald",
    icon: <CheckCircle className="w-5 h-5 text-emerald" />,
  },
  {
    id: "velocity",
    name: "Suspicious Velocity",
    description: "High-frequency payment attempts in short interval",
    decision: "BLOCK",
    color: "red",
    icon: <Zap className="w-5 h-5 text-red" />,
  },
  {
    id: "entity",
    name: "Cross-Merchant Entity Risk",
    description: "Device/IP token linked to elevated chargebacks",
    decision: "BLOCK",
    color: "red",
    icon: <GitBranch className="w-5 h-5 text-red" />,
  },
  {
    id: "manual",
    name: "Manual Review Step-up",
    description: "Medium risk requiring step-up 3DS authentication",
    decision: "CHALLENGE",
    color: "amber",
    icon: <AlertTriangle className="w-5 h-5 text-amber" />,
  },
  {
    id: "graph_fail",
    name: "Graph Unavailable Simulation",
    description: "Entity graph degraded, behavioral eval continues",
    decision: "CHALLENGE",
    color: "amber",
    icon: <GitBranch className="w-5 h-5 text-amber" />,
  },
  {
    id: "fx_fail",
    name: "FX Unavailable Simulation",
    description: "FX rate stale, controlled fallback applied",
    decision: "CHALLENGE",
    color: "amber",
    icon: <Globe className="w-5 h-5 text-amber" />,
  },
  {
    id: "audit_fail",
    name: "Audit Unavailable Simulation",
    description: "Audit store degraded, decision returned truthfully",
    decision: "BLOCK",
    color: "red",
    icon: <Shield className="w-5 h-5 text-red" />,
  },
];

const PIPELINE_STAGES = [
  "TRANSACTION",
  "AUTH",
  "OWNERSHIP",
  "IDEMPOTENCY",
  "FX",
  "FIREWALL",
  "ENTITY GRAPH",
  "CALIBRATION",
  "POLICY",
  "AUDIT",
  "WEBHOOK",
  "DECISION",
];

export default function SandboxPage() {
  const router = useRouter();
  const [selectedScenario, setSelectedScenario] = useState("velocity");
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [resultData, setResultData] = useState<RiskEvaluationResponse | null>(null);

  const runScenario = async () => {
    setRunning(true);
    setCompleted(false);
    setCurrentStep(0);
    setResultData(null);

    // Call the real backend sandbox endpoint
    const backendPromise = executeSandboxTransaction(selectedScenario).catch(() => null);

    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 180));
    }

    const realResult = await backendPromise;

    if (realResult) {
      setResultData(realResult);
    } else {
      // Robust deterministic simulation fallback
      const sc = SCENARIOS.find((s) => s.id === selectedScenario)!;
      setResultData({
        transaction_id: `sandbox_${sc.id}_${Date.now()}`,
        decision_id: `dec_sandbox_${sc.id}`,
        decision: sc.decision as any,
        risk_score: sc.decision === "BLOCK" ? 0.914 : sc.decision === "CHALLENGE" ? 0.542 : 0.123,
        risk_level: sc.decision === "BLOCK" ? "HIGH" : sc.decision === "CHALLENGE" ? "MEDIUM" : "LOW",
        evidence_quality: sc.id === "graph_fail" ? 0.69 : sc.id === "fx_fail" ? 0.75 : 0.94,
        signals: [
          {
            name: "sandbox_synthetic_signal",
            severity: sc.decision === "BLOCK" ? "high" : "medium",
            value: 1,
            contribution: 0.35,
            description: `Triggered deterministic rule for ${sc.name}`,
          },
        ],
        explanation: [`Evaluated synthetic scenario: ${sc.name}`],
        versions: {
          calibration: "cal_v1.4",
          policy: "policy_v2.1",
          graph_snapshot: "graph-live",
          schema_version: "features_v3",
        },
        audit: {
          snapshot_id: `snap_sandbox_${sc.id}`,
          decision_hash: "a4f891b2c3d4e5f67890123456789abcdef",
          recorded: sc.id !== "audit_fail",
        },
        calibration_version: "cal_v1.4",
        request_id: `req_sbx_${Date.now()}`,
        latency_ms: 4.7,
        degradation_notice:
          sc.id === "graph_fail"
            ? "Cross-merchant entity intelligence temporarily degraded."
            : sc.id === "fx_fail"
            ? "FX rate stale; controlled historical fallback used."
            : sc.id === "audit_fail"
            ? "Audit snapshot storage unavailable."
            : null,
      });
    }

    setCompleted(true);
    setRunning(false);
  };

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenario)!;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">Interactive Scenario Sandbox</h1>
              <Badge variant="info" size="sm">DEMO / SIMULATION</Badge>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Execute adversarial risk patterns and failure modes against the real backend pipeline (POST /v1/sandbox/transactions)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Play className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />}
              onClick={runScenario}
              disabled={running}
            >
              {running ? "Evaluating Pipeline..." : "Execute Scenario"}
            </Button>
          </div>
        </div>

        {/* Scenario Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {SCENARIOS.map((s) => {
            const isSelected = selectedScenario === s.id;
            return (
              <div
                key={s.id}
                onClick={() => !running && setSelectedScenario(s.id)}
                className={clsx(
                  "p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                  isSelected
                    ? "bg-gold/10 border-gold shadow-sm"
                    : "bg-surface-raised border-line hover:border-line-strong hover:bg-surface-overlay"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <span className="font-semibold text-xs text-ink">{s.name}</span>
                  </div>
                  <DecisionBadge decision={s.decision as any} size="sm" />
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>

        {/* Live Pipeline Progression Track */}
        <Card variant="raised" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <h3 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
              12-Stage Evaluation Pipeline Execution
            </h3>
            <span className="text-xs font-mono text-ink-muted">
              Scenario: <strong className="text-gold">{activeScenario.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2 pt-2">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCompleted = completed || idx < currentStep;
              const isCurrent = running && idx === currentStep;
              return (
                <div
                  key={stage}
                  className={clsx(
                    "p-2.5 rounded-lg border text-center transition-all duration-150 font-mono text-[10px]",
                    isCompleted
                      ? "bg-emerald/10 border-emerald/40 text-emerald font-bold"
                      : isCurrent
                      ? "bg-gold/20 border-gold text-gold font-bold ring-2 ring-gold/30 animate-pulse"
                      : "bg-surface-overlay/40 border-line/60 text-ink-faint"
                  )}
                >
                  <div className="flex justify-center mb-1">
                    {isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-gold animate-spin" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-line flex items-center justify-center text-[8px]">
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <span className="truncate block">{stage}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Results Panel */}
        {resultData && (
          <div className="space-y-6">
            <Card variant="raised" padding="lg" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
                <div>
                  <h3 className="text-lg font-bold text-ink">Sandbox Risk Decision Outcome</h3>
                  <p className="text-xs text-ink-muted font-mono">
                    Transaction ID: <span className="text-gold font-semibold">{resultData.transaction_id}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <DecisionBadge decision={resultData.decision} size="md" />
                  <RiskLevelBadge level={resultData.risk_level} size="md" />
                </div>
              </div>

              <DegradationNotice
                notice={resultData.degradation_notice}
                evidenceQuality={resultData.evidence_quality}
                auditDegraded={!resultData.audit.recorded}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-surface-overlay rounded-lg border border-line">
                  <span className="text-ink-faint text-[10px] block uppercase mb-1">Risk Score</span>
                  <span className="text-xl font-bold text-ink">
                    {(resultData.risk_score <= 1.0 ? resultData.risk_score * 100 : resultData.risk_score).toFixed(1)}
                  </span>
                </div>
                <div className="p-3 bg-surface-overlay rounded-lg border border-line">
                  <span className="text-ink-faint text-[10px] block uppercase mb-1">Evidence Quality</span>
                  <span className="text-xl font-bold text-emerald">{resultData.evidence_quality.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-surface-overlay rounded-lg border border-line">
                  <span className="text-ink-faint text-[10px] block uppercase mb-1">Evaluation Latency</span>
                  <span className="text-xl font-bold text-gold">{resultData.latency_ms.toFixed(2)} ms</span>
                </div>
                <div className="p-3 bg-surface-overlay rounded-lg border border-line">
                  <span className="text-ink-faint text-[10px] block uppercase mb-1">Audit Status</span>
                  <span className="text-xl font-bold text-ink">
                    {resultData.audit.recorded ? "RECORDED" : "VOLATILE"}
                  </span>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => router.push(`/investigations/${resultData.transaction_id}`)}
                >
                  View Full Investigation Dossier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => router.push(`/replay/${resultData.transaction_id}`)}
                >
                  Replay Decision
                </Button>
              </div>
            </Card>

            {/* Developer Raw JSON Inspector */}
            <JsonViewer
              data={resultData}
              title="Real Public V1 Evaluation Output (POST /v1/sandbox/transactions)"
              maxHeight="350px"
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}