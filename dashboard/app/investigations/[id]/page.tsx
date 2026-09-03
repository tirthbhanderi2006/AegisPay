"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Shield,
  Clock,
  RotateCcw,
  GitBranch,
  Copy,
  Check,
  CheckCircle,
  AlertTriangle,
  Lock,
  Terminal,
  Activity,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  DecisionBadge,
  RiskLevelBadge,
  Tabs,
  type TabItem,
} from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { RiskScoreGauge } from "@/components/risk/RiskScoreGauge";
import { RiskSignalList } from "@/components/risk/RiskSignalList";
import { DegradationNotice } from "@/components/risk/DegradationNotice";
import { PrivacyToken } from "@/components/security/PrivacyToken";
import { TimelineViewer } from "@/components/data-display/TimelineViewer";
import { JsonViewer } from "@/components/data-display/JsonViewer";
import { fetchTransaction } from "@/lib/api";
import type { RiskEvaluationResponse } from "@/lib/types";

export default function InvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = (params.id as string) || "txn_001";

  const [copiedHash, setCopiedHash] = useState(false);
  const [activeTab, setActiveTab] = useState("dossier");

  const [data, setData] = useState<RiskEvaluationResponse>({
    transaction_id: transactionId,
    decision_id: `dec_${transactionId}_1787823879`,
    decision: "BLOCK",
    risk_score: 0.914,
    risk_level: "HIGH",
    evidence_quality: 0.94,
    signals: [
      {
        name: "payment_velocity",
        severity: "high",
        value: 12,
        contribution: 0.35,
        description: "12 rapid payment attempts detected within 2-minute sliding window.",
      },
      {
        name: "behavioral_deviation",
        severity: "high",
        value: 0.87,
        contribution: 0.28,
        description: "Behavioral interaction cadence deviates >3.4σ from legitimate customer baseline.",
      },
      {
        name: "entity_graph_spread",
        severity: "medium",
        value: 4,
        contribution: 0.18,
        description: "Associated device token linked across 4 distinct payment instruments.",
      },
      {
        name: "instrument_cycling",
        severity: "medium",
        value: 3,
        contribution: 0.12,
        description: "Rapid sequential card testing observed on same merchant checkout session.",
      },
    ],
    explanation: [
      "Elevated transaction velocity was detected (12 attempts in 2-minute window).",
      "Behavioral interaction cadence deviates >3.4σ from legitimate customer baseline.",
      "Associated device token dev_••••91A2 linked across 4 distinct payment instruments.",
      "High correlation with known synthetic testing patterns across merchant network.",
    ],
    versions: {
      calibration: "cal_v1.4",
      policy: "policy_v2.1",
      graph_snapshot: "graph-live",
      schema_version: "features_v3",
    },
    audit: {
      snapshot_id: `snap_${transactionId}`,
      decision_hash: "a4f891b2c3d4e5f67890123456789abcdefa4f891b2c3d4e5f67890123456789abc",
      recorded: true,
    },
    calibration_version: "cal_v1.4",
    request_id: "req_8819ab01",
    latency_ms: 4.7,
    created_at: "2026-08-29T14:31:02Z",
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchTransaction(transactionId);
        if (res && res.transaction_id) {
          setData(res);
        }
      } catch {
        // Fallback default maintained
      }
    }
    load();
  }, [transactionId]);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(data.audit.decision_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const tabs: TabItem[] = [
    { value: "dossier", label: "Investigation Dossier", icon: <Shield className="w-3.5 h-3.5" /> },
    { value: "signals", label: `Risk Signals (${data.signals.length})`, icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { value: "timeline", label: "Temporal Timeline", icon: <Clock className="w-3.5 h-3.5" /> },
    { value: "json", label: "API JSON Response", icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 select-text">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/transactions")}
              aria-label="Back to transactions ledger"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                <span>INVESTIGATION DOSSIER</span>
                <span>/</span>
                <span className="font-bold text-ink">{data.transaction_id}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-ink mt-0.5">
                Deterministic Risk Forensic Analysis
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <DecisionBadge decision={data.decision} size="md" />
            <RiskLevelBadge level={data.risk_level} size="md" />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => router.push(`/replay/${data.transaction_id}`)}
            >
              Replay Decision
            </Button>
          </div>
        </div>

        {/* Degradation notice banner */}
        <DegradationNotice
          notice={data.degradation_notice}
          evidenceQuality={data.evidence_quality}
          auditDegraded={!data.audit.recorded}
        />

        {/* Split-Pane Forensic Console */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Main Panel (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="line">
              {/* Tab 1: Dossier */}
              {activeTab === "dossier" && (
                <div className="space-y-6 mt-4">
                  {/* Deterministic Explanation Card */}
                  <Card variant="flat" padding="md" className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-line">
                      <Shield className="w-4 h-4 text-accent" />
                      <h3 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                        Why this decision? (Deterministic Root Cause)
                      </h3>
                    </div>
                    <ul className="space-y-2 text-xs text-ink-secondary leading-relaxed pt-1">
                      {data.explanation.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Risk Signals */}
                  <Card variant="flat" padding="md" className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <h3 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                        Detected Risk Signals
                      </h3>
                      <button
                        onClick={() => setActiveTab("signals")}
                        className="text-xs text-accent hover:underline font-mono"
                      >
                        Detailed Breakdown &rarr;
                      </button>
                    </div>
                    <RiskSignalList signals={data.signals} />
                  </Card>

                  {/* Privacy-Safe Entity Network Identifiers */}
                  <Card variant="flat" padding="md" className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald" />
                        <h3 className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                          Privacy-Safe Entity Identifiers (Zero Raw PII)
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<GitBranch className="w-3.5 h-3.5" />}
                        onClick={() => router.push("/entities")}
                        className="h-7 text-xs"
                      >
                        Inspect Graph
                      </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-surface-subtle rounded border border-line">
                        <span className="text-ink-muted block text-[10px] uppercase font-mono mb-1">
                          Device Token
                        </span>
                        <PrivacyToken token="dev_tok_iphone14_91A2" type="device" />
                      </div>
                      <div className="p-2.5 bg-surface-subtle rounded border border-line">
                        <span className="text-ink-muted block text-[10px] uppercase font-mono mb-1">
                          IP Token
                        </span>
                        <PrivacyToken token="ip_tok_103_21_7F12" type="ip" />
                      </div>
                      <div className="p-2.5 bg-surface-subtle rounded border border-line">
                        <span className="text-ink-muted block text-[10px] uppercase font-mono mb-1">
                          Account Token
                        </span>
                        <PrivacyToken token="acct_tok_usr_99812" type="account" />
                      </div>
                      <div className="p-2.5 bg-surface-subtle rounded border border-line">
                        <span className="text-ink-muted block text-[10px] uppercase font-mono mb-1">
                          Payment Instrument
                        </span>
                        <PrivacyToken token="pi_tok_visa_4111" type="card" />
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 2: Signals */}
              {activeTab === "signals" && (
                <div className="space-y-4 mt-4">
                  <RiskSignalList signals={data.signals} />
                </div>
              )}

              {/* Tab 3: Timeline */}
              {activeTab === "timeline" && (
                <div className="space-y-4 mt-4">
                  <TimelineViewer
                    events={[
                      {
                        id: "evt_01",
                        timestamp: "2026-08-29T14:31:02.000Z",
                        stage: "INGEST",
                        label: "Transaction Ingestion & Auth",
                        description: "API key authenticated for merchant m_sandbox. Privacy tokens verified.",
                        latency_ms: 0.8,
                      },
                      {
                        id: "evt_02",
                        timestamp: "2026-08-29T14:31:02.001Z",
                        stage: "IDEMPOTENCY",
                        label: "Canonical Hash Cache Check",
                        description: "SHA-256 payload canonicalized. No duplicate evaluation in progress.",
                        latency_ms: 0.1,
                      },
                      {
                        id: "evt_03",
                        timestamp: "2026-08-29T14:31:02.002Z",
                        stage: "FIREWALL",
                        label: "Behavioral Feature Extraction",
                        description: "Extracted 27 deterministic risk signals. Velocity burst detected.",
                        latency_ms: 0.82,
                        status: "danger",
                      },
                      {
                        id: "evt_04",
                        timestamp: "2026-08-29T14:31:02.003Z",
                        stage: "GRAPH",
                        label: "Entity Graph Risk Spread",
                        description: "Evaluated 2-hop radius entity network. Propagated multi-card risk factor.",
                        latency_ms: 0.77,
                        status: "warning",
                      },
                      {
                        id: "evt_05",
                        timestamp: "2026-08-29T14:31:02.004Z",
                        stage: "POLICY",
                        label: "Calibrated Decision Policy",
                        description: "Applied policy-v2.1 thresholds: Risk score 0.914 >= 0.70 => BLOCK.",
                        latency_ms: 0.02,
                        status: "danger",
                      },
                      {
                        id: "evt_06",
                        timestamp: "2026-08-29T14:31:02.005Z",
                        stage: "AUDIT",
                        label: "SHA-256 Audit Snapshot Record",
                        description: "Decision record snap_txn_001 immutably saved with verified hash.",
                        latency_ms: 0.11,
                        status: "success",
                      },
                    ]}
                  />
                </div>
              )}

              {/* Tab 4: JSON */}
              {activeTab === "json" && (
                <div className="mt-4">
                  <JsonViewer data={data} title="Public V1 Risk Evaluation Response" maxHeight="450px" />
                </div>
              )}
            </Tabs>
          </div>

          {/* Right Side Metadata & Audit Panel (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Calibrated Risk Score Gauge */}
            <Card variant="flat" padding="lg" className="flex flex-col items-center justify-center space-y-3">
              <span className="font-mono text-[10px] uppercase text-ink-muted tracking-wider">
                Calibrated Risk Score
              </span>
              <RiskScoreGauge score={data.risk_score} level={data.risk_level} size="lg" />
              <div className="w-full pt-3 border-t border-line grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div>
                  <span className="text-ink-muted text-[10px] block uppercase">Evidence</span>
                  <span className="text-emerald font-bold">{data.evidence_quality.toFixed(2)} / 1.0</span>
                </div>
                <div>
                  <span className="text-ink-muted text-[10px] block uppercase">Latency</span>
                  <span className="text-ink font-bold">{data.latency_ms.toFixed(2)} ms</span>
                </div>
              </div>
            </Card>

            {/* Cryptographic Audit Record */}
            <Card variant="flat" padding="md" className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <span className="font-bold text-ink uppercase tracking-wider">Immutable Audit</span>
                <Badge variant={data.audit.recorded ? "success" : "danger"} size="sm" dot>
                  {data.audit.recorded ? "RECORDED" : "VOLATILE"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-ink-muted text-[10px] uppercase block">Snapshot ID</span>
                  <span className="text-ink font-semibold">{data.audit.snapshot_id}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] uppercase text-ink-muted">
                    <span>SHA-256 Decision Hash</span>
                    <button
                      onClick={handleCopyHash}
                      className="text-accent hover:underline flex items-center gap-1"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald" /> : <Copy className="w-3 h-3" />}
                      {copiedHash ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2 bg-surface-subtle rounded border border-line text-ink select-all break-all text-[10px] mt-0.5">
                    {data.audit.decision_hash}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60">
                  <div>
                    <span className="text-ink-muted text-[10px] uppercase block">Calibration</span>
                    <span className="text-ink">{data.versions.calibration}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-[10px] uppercase block">Policy</span>
                    <span className="text-ink">{data.versions.policy}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-line/60">
                  <span className="text-ink-muted text-[10px] uppercase block">Request ID</span>
                  <span className="text-ink select-all">{data.request_id}</span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card variant="flat" padding="md" className="space-y-2">
              <span className="font-mono text-[10px] uppercase text-ink-muted tracking-wider block mb-1">
                Actions
              </span>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => router.push(`/replay/${data.transaction_id}`)}
              >
                Replay Decision (Score Delta 0.00)
              </Button>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<GitBranch className="w-3.5 h-3.5" />}
                onClick={() => router.push("/entities")}
              >
                Inspect Entity Network
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}