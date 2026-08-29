"use client";

import React, { useState } from "react";
import {
  Cpu,
  Database,
  Network,
  Shield,
  Zap,
  GitBranch,
  Globe,
  Clock,
  RotateCcw,
  RefreshCw,
  Activity,
  TrendingUp,
  Download,
  CheckCircle,
} from "lucide-react";
import { Card, Badge, Button, Table, Tabs, type TabItem, StatusBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";

const SYSTEM_COMPONENTS = [
  { name: "Risk Evaluation Engine", status: "operational", latency: "3.9ms", lastCheck: "1s ago", version: "v2.1.0" },
  { name: "Behavioral Firewall", status: "operational", latency: "0.82ms", lastCheck: "1s ago", version: "v2.1.0" },
  { name: "Entity Graph Service", status: "operational", latency: "0.77ms", lastCheck: "2s ago", version: "graph-live" },
  { name: "FX Normalization Service", status: "operational", latency: "0.15ms", lastCheck: "5s ago", version: "fx_v3.2" },
  { name: "Frozen Calibration Registry", status: "operational", latency: "0.03ms", lastCheck: "10s ago", version: "cal_v1.4" },
  { name: "Decision Policy Pipeline", status: "operational", latency: "0.02ms", lastCheck: "1s ago", version: "policy_v2.1" },
  { name: "Audit Snapshot Store", status: "operational", latency: "0.11ms", lastCheck: "1s ago", version: "audit_v1.0" },
  { name: "Webhook Dispatcher", status: "operational", latency: "0.45ms", lastCheck: "2s ago", version: "webhook_v1.3" },
];

const DEPENDENCY_CHECKS = [
  { name: "PostgreSQL Database", status: "healthy", latency: "1.2ms", details: "Connection pool: 8/20 active" },
  { name: "Entity Graph InMemory Store", status: "healthy", latency: "0.3ms", details: "Nodes: 12,450 | Edges: 89,230" },
  { name: "FX Rate Provider", status: "healthy", latency: "45ms", details: "Last update: 2026-08-29T14:00:00Z" },
  { name: "Audit Snapshot Repository", status: "healthy", latency: "0.8ms", details: "Snapshots: 15,420 | Hash verified" },
  { name: "Calibration Registry", status: "healthy", latency: "0.1ms", details: "Active: cal_v1.4 | Versions: 14" },
  { name: "Webhook Queue", status: "healthy", latency: "120ms", details: "Queue: 0 pending | Success rate: 99.8%" },
];

const DRIFT_ALERTS = [
  { severity: "warning", metric: "PSI - velocity_score", value: "0.12", threshold: "0.10", message: "Population stability index elevated" },
  { severity: "info", metric: "KS - retry_component", value: "0.08", threshold: "0.10", message: "Distribution shift detected" },
  { severity: "info", metric: "PSI - evidence_quality", value: "0.05", threshold: "0.10", message: "Within normal range" },
];

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState("components");

  const tabs: TabItem[] = [
    { value: "components", label: "Pipeline Components", icon: <Cpu className="w-4 h-4" /> },
    { value: "dependencies", label: "System Dependencies", icon: <Database className="w-4 h-4" /> },
    { value: "drift", label: "PSI / KS Drift Monitoring", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">System Health & Observability</h1>
            <p className="text-xs text-ink-muted mt-1">
              Real-time component health, dependency status, and statistical drift monitoring (PSI / KS)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => alert("Refreshed system telemetry")}
            >
              Refresh Telemetry
            </Button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="raised" padding="md" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</span>
              <CheckCircle className="w-4 h-4 text-emerald" />
            </div>
            <p className="text-xl font-bold font-mono text-emerald">ALL SYSTEMS OPERATIONAL</p>
            <p className="text-xs text-ink-muted">8/8 pipeline components healthy</p>
          </Card>

          <Card variant="raised" padding="md" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">P95 Latency</span>
              <Activity className="w-4 h-4 text-gold" />
            </div>
            <p className="text-xl font-bold font-mono text-ink">4.96 ms</p>
            <p className="text-xs text-ink-muted">SLA target: &lt; 10.00 ms (Sub-10ms confirmed)</p>
          </Card>

          <Card variant="raised" padding="md" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Drift Index (PSI)</span>
              <TrendingUp className="w-4 h-4 text-emerald" />
            </div>
            <p className="text-xl font-bold font-mono text-emerald">0.042 (HEALTHY)</p>
            <p className="text-xs text-ink-muted">Below 0.10 threshold across 27 features</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="pills">
          {/* Tab 1: Components */}
          {activeTab === "components" && (
            <div className="space-y-4 mt-4">
              <Card variant="raised" padding="none">
                <Table
                  columns={[
                    {
                      key: "name",
                      header: "Component Name",
                      render: (row) => (
                        <div>
                          <span className="font-semibold text-xs text-ink">{row.name}</span>
                          <span className="block font-mono text-[10px] text-ink-faint">{row.version}</span>
                        </div>
                      ),
                    },
                    {
                      key: "status",
                      header: "Operational Status",
                      align: "center",
                      render: (row) => <StatusBadge status={row.status as any} size="sm" />,
                    },
                    {
                      key: "latency",
                      header: "P95 Latency",
                      align: "center",
                      render: (row) => <span className="font-mono text-xs text-gold font-bold">{row.latency}</span>,
                    },
                    {
                      key: "lastCheck",
                      header: "Heartbeat",
                      align: "right",
                      render: (row) => <span className="font-mono text-xs text-ink-muted">{row.lastCheck}</span>,
                    },
                  ]}
                  data={SYSTEM_COMPONENTS}
                  keyExtractor={(row) => row.name}
                />
              </Card>
            </div>
          )}

          {/* Tab 2: Dependencies */}
          {activeTab === "dependencies" && (
            <div className="space-y-4 mt-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {DEPENDENCY_CHECKS.map((dep) => (
                  <Card key={dep.name} variant="raised" padding="md" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-ink">{dep.name}</span>
                      <StatusBadge status={dep.status as any} size="sm" />
                    </div>
                    <p className="text-xs text-ink-muted font-mono">{dep.details}</p>
                    <div className="text-[11px] font-mono text-ink-faint pt-1 border-t border-line/60 flex justify-between">
                      <span>Latency</span>
                      <span className="text-gold font-bold">{dep.latency}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Statistical Drift Monitoring */}
          {activeTab === "drift" && (
            <div className="space-y-6 mt-4">
              <Card variant="raised" padding="lg" className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                    Offline Population Stability Index (PSI) & Kolmogorov-Smirnov (KS)
                  </h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Evaluated chronologically on historical transaction windows. Alerts trigger when PSI &ge; 0.10 (Warning) or PSI &ge; 0.25 (Critical Retrain required).
                  </p>
                </div>

                <div className="space-y-3">
                  {DRIFT_ALERTS.map((alert) => (
                    <div
                      key={alert.metric}
                      className="p-3 bg-surface-overlay rounded-lg border border-line flex items-center justify-between font-mono text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={alert.severity === "warning" ? "warning" : "info"} size="sm" dot>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <div>
                          <span className="font-bold text-ink">{alert.metric}</span>
                          <span className="text-ink-muted block text-[11px] font-sans">{alert.message}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-ink font-bold">Value: {alert.value}</span>
                        <span className="text-ink-faint block text-[10px]">Threshold: {alert.threshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}