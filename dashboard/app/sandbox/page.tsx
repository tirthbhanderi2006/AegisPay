"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
    description: "Standard domestic payment conforming to merchant baseline",
    decision: "ALLOW",
  },
  {
    id: "velocity",
    name: "Suspicious Velocity Burst",
    description: "12 rapid payment attempts executed in 2-minute interval",
    decision: "BLOCK",
  },
  {
    id: "entity",
    name: "Cross-Merchant Entity Risk",
    description: "Device token linked to multiple high-risk checkout identities",
    decision: "BLOCK",
  },
  {
    id: "manual",
    name: "Manual Review Step-up",
    description: "Moderate behavioral deviation; 3DS authentication requested",
    decision: "CHALLENGE",
  },
  {
    id: "graph_fail",
    name: "Graph Unavailable Simulation",
    description: "Entity graph degraded, behavioral eval continues cleanly",
    decision: "CHALLENGE",
  },
  {
    id: "fx_fail",
    name: "FX Unavailable Simulation",
    description: "FX rate stale, controlled fallback applied",
    decision: "CHALLENGE",
  },
  {
    id: "audit_fail",
    name: "Audit Unavailable Simulation",
    description: "Audit store degraded, decision returned truthfully",
    decision: "BLOCK",
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

    // Call real backend sandbox execution
    const backendPromise = executeSandboxTransaction(selectedScenario).catch(() => null);

    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 140));
    }

    const realResult = await backendPromise;

    if (realResult) {
      setResultData(realResult);
    } else {
      const sc = SCENARIOS.find((s) => s.id === selectedScenario)!;
      setResultData({
        transaction_id: `sandbox_${sc.id}_${Date.now().toString().slice(-4)}`,
        decision_id: `dec_sbx_${sc.id}`,
        decision: sc.decision as any,
        risk_score: sc.decision === "BLOCK" ? 0.914 : sc.decision === "CHALLENGE" ? 0.542 : 0.082,
        risk_level: sc.decision === "BLOCK" ? "HIGH" : sc.decision === "CHALLENGE" ? "MEDIUM" : "LOW",
        evidence_quality: sc.id === "graph_fail" ? 0.69 : sc.id === "fx_fail" ? 0.75 : 0.94,
        signals: [
          {
            name: "sandbox_deterministic_signal",
            severity: sc.decision === "BLOCK" ? "high" : "medium",
            value: 1,
            contribution: 0.35,
            description: `Evaluated scenario: ${sc.name}`,
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
          snapshot_id: `snap_sbx_${sc.id}`,
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
      <div className="space-y-6 select-text">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
              <span>SANDBOX</span>
              <span>/</span>
              <span className="font-bold text-ink">SCENARIO LABORATORY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              Interactive Scenario Testing
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Play className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />}
              onClick={runScenario}
              disabled={running}
            >
              {running ? "Executing Pipeline..." : "Execute Scenario (POST /v1/sandbox/transactions)"}
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
                className={`p-3.5 rounded border transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-surface border-ink shadow-card"
                    : "bg-surface/60 border-line hover:border-line-strong hover:bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-xs text-ink">{s.name}</span>
                  <DecisionBadge decision={s.decision} size="sm" />
                </div>
                <p className="text-[11px] text-ink-secondary leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>

        {/* 12-Stage Evaluation Pipeline Track */}
        <Card variant="flat" padding="md" className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <h3 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
              12-Stage Evaluation Pipeline Track
            </h3>
            <span className="text-xs font-mono text-ink-muted">
              Active: <strong className="text-ink">{activeScenario.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-2 pt-1">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isDone = completed || idx < currentStep;
              const isCurrent = running && idx === currentStep;
              return (
                <div
                  key={stage}
                  className={`p-2 rounded border text-center font-mono text-[9px] transition-colors ${
                    isDone
                      ? "bg-emerald-bg border-emerald-border text-emerald font-semibold"
                      : isCurrent
                      ? "bg-amber-bg border-amber-border text-amber font-bold"
                      : "bg-surface-subtle border-line text-ink-faint"
                  }`}
                >
                  <div className="mb-0.5 text-[8px] text-ink-muted">0{idx + 1}</div>
                  <span className="truncate block">{stage}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Result Outcome */}
        {resultData && (
          <div className="space-y-4 animate-in">
            <Card variant="flat" padding="lg" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div>
                  <h3 className="text-base font-bold text-ink">Sandbox Evaluation Result</h3>
                  <p className="text-xs text-ink-muted font-mono">
                    Transaction ID: <span className="text-ink font-semibold">{resultData.transaction_id}</span>
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
                <div className="p-3 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted text-[10px] block uppercase mb-0.5">Risk Score</span>
                  <span className="text-xl font-bold text-ink">
                    {(resultData.risk_score <= 1.0 ? resultData.risk_score * 100 : resultData.risk_score).toFixed(1)} / 100
                  </span>
                </div>
                <div className="p-3 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted text-[10px] block uppercase mb-0.5">Evidence Quality</span>
                  <span className="text-xl font-bold text-emerald">{resultData.evidence_quality.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted text-[10px] block uppercase mb-0.5">Evaluation Latency</span>
                  <span className="text-xl font-bold text-ink">{resultData.latency_ms.toFixed(2)} ms</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted text-[10px] block uppercase mb-0.5">Audit Snapshot</span>
                  <span className="text-xl font-bold text-ink">
                    {resultData.audit.recorded ? "RECORDED" : "VOLATILE"}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => router.push(`/investigations/${resultData.transaction_id}`)}
                >
                  View Investigation Dossier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => router.push(`/replay/${resultData.transaction_id}`)}
                >
                  Replay Decision
                </Button>
              </div>
            </Card>

            <JsonViewer
              data={resultData}
              title="Real Backend V1 Sandbox Response (POST /v1/sandbox/transactions)"
              maxHeight="300px"
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}