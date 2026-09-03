"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { clsx } from "clsx";
import {
  ChevronLeft,
  Clock,
  Zap,
  GitBranch,
  Globe,
  SlidersHorizontal,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Shield,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Card, Badge, Button, Tabs, StatusBadge, DecisionBadge, RiskLevelBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";

const TIMELINE_EVENTS = [
  { time: "14:31:02.000", event: "Transaction Created", type: "info", details: "txn_001 received via POST /v1/risk/evaluate", component: "API Gateway", latency: "0.00ms" },
  { time: "14:31:02.012", event: "Authentication Completed", type: "success", details: "3DS ECI 05 verified, device fingerprint captured", component: "Authentication", latency: "0.12ms" },
  { time: "14:31:02.020", event: "Merchant Ownership Verified", type: "success", details: "merchant m_sandbox authenticated via API key", component: "Auth Middleware", latency: "0.08ms" },
  { time: "14:31:02.025", event: "Idempotency Check Passed", type: "success", details: "idem_txn_001 cached, no conflict", component: "Idempotency", latency: "0.05ms" },
  { time: "14:31:02.040", event: "FX Normalization Applied", type: "success", details: "INR 8300.00 → USD 100.00 (rate: 83.00)", component: "FX Converter", latency: "0.15ms" },
  { time: "14:31:02.190", event: "Behavioral Firewall Completed", type: "warning", details: "3 signals detected: velocity, deviation, pattern", component: "Behavioral Firewall", latency: "0.82ms" },
  { time: "14:31:02.960", event: "Entity Graph Evaluated", type: "warning", details: "Cross-merchant risk propagated from dev_••••91A2 & ip_••••7F12", component: "Entity Graph", latency: "0.77ms" },
  { time: "14:31:02.990", event: "Calibration Completed", type: "info", details: "cal_v1.4 applied, evidence quality: 0.94", component: "Calibration", latency: "0.03ms" },
  { time: "14:31:02.995", event: "Policy Decision: BLOCK", type: "danger", details: "Risk score 91.40 ≥ 0.70 threshold", component: "Decision Policy", latency: "0.02ms" },
  { time: "14:31:03.005", event: "Audit Snapshot Created", type: "success", details: "snap_txn_001, hash: a4f891b2c3d4e5f6...", component: "Audit", latency: "0.11ms" },
  { time: "14:31:03.050", event: "Webhook Dispatched", type: "success", details: "risk.decision.created sent with HMAC-SHA256", component: "Webhook Dispatcher", latency: "0.45ms" },
  { time: "14:31:03.100", event: "Response Returned", type: "info", details: "Total latency: 4.7ms, decision_id: dec_txn_001_...", component: "API Gateway", latency: "0.05ms" },
];

const PIPELINE_STAGES = [
  { id: "auth", label: "AUTH", icon: <Shield className="w-4 h-4" />, color: "emerald" },
  { id: "ownership", label: "OWNERSHIP", icon: <Shield className="w-4 h-4" />, color: "emerald" },
  { id: "idempotency", label: "IDEMPOTENCY", icon: <RotateCcw className="w-4 h-4" />, color: "azure" },
  { id: "fx", label: "FX", icon: <Globe className="w-4 h-4" />, color: "azure" },
  { id: "behavioral", label: "BEHAVIORAL", icon: <Zap className="w-4 h-4" />, color: "amber" },
  { id: "entity", label: "ENTITY GRAPH", icon: <GitBranch className="w-4 h-4" />, color: "purple" },
  { id: "calibration", label: "CALIBRATION", icon: <SlidersHorizontal className="w-4 h-4" />, color: "emerald" },
  { id: "policy", label: "POLICY", icon: <FileText className="w-4 h-4" />, color: "red" },
  { id: "audit", label: "AUDIT", icon: <CheckCircle className="w-4 h-4" />, color: "emerald" },
  { id: "webhook", label: "WEBHOOK", icon: <ExternalLink className="w-4 h-4" />, color: "azure" },
];

export default function TimelinePage() {
  const params = useParams();
  const transactionId = params.id as string;
  const [asOf, setAsOf] = useState("2026-08-29T14:31:03.100Z");

  return (
    <MainLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} aria-label="Back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-ink">Event Timeline</h1>
              <p className="text-ink-muted mt-1">Transaction {transactionId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DecisionBadge decision="BLOCK" size="lg" />
            <RiskLevelBadge level="HIGH" size="lg" />
          </div>
        </div>

        {/* AS_OF Selector */}
        <div className="flex items-center gap-4 p-4 bg-surface-subtle rounded-xl border border-line">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent" />
            <div>
              <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">AS_OF TIMESTAMP</p>
              <p className="font-mono text-ink">Only events T ≤ as_of are visible</p>
            </div>
          </div>
          <input
            type="datetime-local"
            value={asOf.slice(0, 16)}
            onChange={(e) => setAsOf(e.target.value + ":00Z")}
            className="px-4 py-2.5 bg-surface border border-line rounded-lg text-ink font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <Badge variant="info" size="sm">Temporal cutoff enforced</Badge>
        </div>

        {/* Pipeline Overview */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-surface rounded-xl border border-line">
          {PIPELINE_STAGES.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle border border-line"
            >
              <span className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${stage.color}/15 text-${stage.color}`)}>
                {stage.icon}
              </span>
              <span className="text-sm font-medium text-ink">{stage.label}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div>
          <Card variant="raised" padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-line">
              <h2 className="text-lg font-semibold text-ink">Chronological Events</h2>
            </div>
            <div className="divide-y divide-line/50">
              {TIMELINE_EVENTS.map((event, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 hover:bg-surface-subtle transition-colors relative"
                >
                  <div className="flex flex-col items-center flex-shrink-0 relative">
                    <div className={clsx("w-3 h-3 rounded-full border-2 z-10",
                      event.type === "success" && "bg-emerald border-emerald",
                      event.type === "warning" && "bg-amber border-amber",
                      event.type === "danger" && "bg-red border-red",
                      event.type === "info" && "bg-azure border-azure"
                    )} />
                    {i < TIMELINE_EVENTS.length - 1 && <div className="w-0.5 h-full bg-line mt-1 flex-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-ink-muted whitespace-nowrap">{event.time}</span>
                      <span className="font-medium text-ink">{event.event}</span>
                      <Badge variant={event.type === "success" ? "success" : event.type === "warning" ? "warning" : event.type === "danger" ? "danger" : "info"} size="sm">
                        {event.component}
                      </Badge>
                      <span className="font-mono text-ink-muted ml-auto">{event.latency}</span>
                    </div>
                    <p className="text-sm text-ink-muted mt-1 font-mono">{event.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="raised" padding="md" className="text-center">
            <p className="text-3xl font-bold font-mono text-ink">12</p>
            <p className="text-sm text-ink-muted">Total Events</p>
          </Card>
          <Card variant="raised" padding="md" className="text-center">
            <p className="text-3xl font-bold font-mono text-ink">4.7ms</p>
            <p className="text-sm text-ink-muted">Total Latency</p>
          </Card>
          <Card variant="raised" padding="md" className="text-center">
            <p className="text-3xl font-bold font-mono text-emerald">11</p>
            <p className="text-sm text-ink-muted">Completed</p>
          </Card>
          <Card variant="raised" padding="md" className="text-center">
            <p className="text-3xl font-bold font-mono text-accent">0</p>
            <p className="text-sm text-ink-muted">Failed</p>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
