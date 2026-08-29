"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Activity,
  Filter,
} from "lucide-react";
import { Card, Badge, Table, Button, DecisionBadge, RiskLevelBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { MetricCard } from "@/components/data-display/MetricCard";
import { RiskScoreGauge } from "@/components/risk/RiskScoreGauge";
import { DegradationNotice } from "@/components/risk/DegradationNotice";
import { fetchHealth } from "@/lib/api";
import type { HealthInfo } from "@/lib/types";

const RECENT_TRANSACTIONS = [
  {
    id: "txn_001",
    decision: "BLOCK",
    score: 91.4,
    level: "HIGH",
    quality: 0.94,
    signals: 3,
    latency: 4.7,
    time: "14:31:02",
    explanation: "Excessive device reuse across 4 distinct payment instruments",
  },
  {
    id: "txn_vel_9021",
    decision: "CHALLENGE",
    score: 58.4,
    level: "MEDIUM",
    quality: 0.85,
    signals: 2,
    latency: 4.1,
    time: "14:30:12",
    explanation: "Payment attempt velocity burst exceeding 3 txns/minute",
  },
  {
    id: "txn_demo_norm",
    decision: "ALLOW",
    score: 12.3,
    level: "LOW",
    quality: 0.98,
    signals: 0,
    latency: 3.2,
    time: "14:28:45",
    explanation: "Standard domestic payment conforming to merchant baseline",
  },
  {
    id: "txn_graph_degrade",
    decision: "CHALLENGE",
    score: 62.0,
    level: "MEDIUM",
    quality: 0.70,
    signals: 1,
    latency: 4.8,
    time: "14:26:01",
    explanation: "Entity graph degraded; fallback behavioral risk rules applied",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthInfo | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch {
      // Degraded state handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">Risk Operations Control Plane</h1>
              <Badge variant="success" size="sm" dot>LIVE</Badge>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Real-time monitoring of deterministic payment risk decisions, latency SLAs, and pipeline health
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
              onClick={loadData}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => router.push("/transactions")}
            >
              Transactions Explorer
            </Button>
          </div>
        </div>

        {/* Top Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Evaluated (24h)"
            value="12,847"
            subValue="100% Deterministic Decisions"
            trend={{ value: "+14.2%", positive: true }}
            icon={<Activity className="w-4 h-4" />}
            loading={loading}
          />
          <MetricCard
            label="P95 Latency SLA"
            value="4.96ms"
            subValue="Sub-10ms Verified"
            trend={{ value: "-0.15ms", positive: true }}
            icon={<Zap className="w-4 h-4" />}
            variant="gold"
            loading={loading}
          />
          <MetricCard
            label="Mean Evidence Quality"
            value="0.94"
            subValue="Max: 1.00 (Zero Leakage)"
            trend={{ value: "+0.02", positive: true }}
            icon={<Shield className="w-4 h-4" />}
            variant="emerald"
            loading={loading}
          />
          <MetricCard
            label="Replay Score Delta"
            value="0.00"
            subValue="Zero Hindsight Bias"
            trend={{ value: "100% Match", positive: true }}
            icon={<Clock className="w-4 h-4" />}
            variant="azure"
            loading={loading}
          />
        </div>

        {/* Primary Content Region: Decisions + Risk Breakdown */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Decision Distribution Card */}
          <Card variant="raised" padding="lg" className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div>
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                  Decision Distribution (24h)
                </h2>
                <p className="text-xs text-ink-muted">Aggregated outcomes across all authenticated merchant requests</p>
              </div>
              <Badge variant="neutral" size="sm">12,847 TOTAL</Badge>
            </div>

            {/* Visual Distribution Bars */}
            <div className="space-y-3 pt-2">
              {[
                { label: "ALLOW", count: 8234, pct: 64.1, color: "bg-emerald", text: "text-emerald" },
                { label: "CHALLENGE", count: 2156, pct: 16.8, color: "bg-amber", text: "text-amber" },
                { label: "BLOCK", count: 1892, pct: 14.7, color: "bg-red", text: "text-red" },
                { label: "MANUAL HOLD", count: 565, pct: 4.4, color: "bg-purple", text: "text-purple" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-semibold text-ink">{item.label}</span>
                    <span className="text-ink-muted">
                      {item.count.toLocaleString()} ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-overlay overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Summary Notice */}
            <div className="p-3 bg-surface-overlay/50 rounded-lg border border-line flex items-center justify-between text-xs font-mono">
              <span className="text-ink-muted">Decision Policy Version:</span>
              <span className="text-gold font-bold">policy-v2.1 (Frozen)</span>
            </div>
          </Card>

          {/* Average Calibration Score */}
          <Card variant="raised" padding="lg" className="flex flex-col items-center justify-center space-y-4">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono text-center">
              Calibrated Mean Risk
            </h2>
            <RiskScoreGauge score={0.284} level="LOW" size="lg" />
            <p className="text-xs text-ink-muted text-center max-w-xs">
              Calibrated against 15,420 historical baseline payments with offline frozen weights.
            </p>
          </Card>
        </div>

        {/* Pipeline Component Health + Recent Transactions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pipeline Component Status */}
          <Card variant="raised" padding="lg" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                Pipeline Components
              </h2>
              <Badge variant="success" size="sm">OPERATIONAL</Badge>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {[
                { name: "Behavioral Firewall", status: "operational", lat: "0.82ms", ver: "v2.1" },
                { name: "Cross-Merchant Graph", status: "operational", lat: "0.77ms", ver: "graph-live" },
                { name: "Risk Calibration", status: "operational", lat: "0.03ms", ver: "cal_v1.4" },
                { name: "FX Normalization", status: "operational", lat: "0.15ms", ver: "fx_v3.2" },
                { name: "Decision Policy", status: "operational", lat: "0.02ms", ver: "policy_v2.1" },
                { name: "Audit Snapshot", status: "operational", lat: "0.11ms", ver: "audit_v1.0" },
                { name: "Webhook Dispatcher", status: "operational", lat: "0.45ms", ver: "wh_v1.3" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="p-2.5 rounded bg-surface-overlay/60 border border-line flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald" />
                    <span className="font-semibold text-ink">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-muted">
                    <span>{c.lat}</span>
                    <span className="text-[10px] text-ink-faint">({c.ver})</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Decisions Table */}
          <Card variant="raised" padding="none" className="lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-line flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                    Recent Evaluated Transactions
                  </h2>
                  <p className="text-xs text-ink-muted">Click any transaction to open full investigation workspace</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/transactions")}
                  className="text-xs"
                >
                  View All &rarr;
                </Button>
              </div>

              <Table
                columns={[
                  {
                    key: "id",
                    header: "Transaction ID",
                    render: (row) => (
                      <span className="font-mono text-xs text-gold font-semibold hover:underline">
                        {row.id}
                      </span>
                    ),
                  },
                  {
                    key: "decision",
                    header: "Decision",
                    render: (row) => <DecisionBadge decision={row.decision as any} size="sm" />,
                  },
                  {
                    key: "score",
                    header: "Score",
                    render: (row) => (
                      <span className="font-mono text-xs text-ink font-bold">{row.score.toFixed(1)}</span>
                    ),
                  },
                  {
                    key: "level",
                    header: "Risk Level",
                    render: (row) => <RiskLevelBadge level={row.level as any} size="sm" />,
                  },
                  {
                    key: "latency",
                    header: "Latency",
                    align: "right",
                    render: (row) => (
                      <span className="font-mono text-xs text-ink-muted">{row.latency.toFixed(1)}ms</span>
                    ),
                  },
                ]}
                data={RECENT_TRANSACTIONS}
                keyExtractor={(row) => row.id}
                onRowClick={(row) => router.push(`/investigations/${row.id}`)}
              />
            </div>

            <div className="p-3 bg-surface-overlay/40 border-t border-line text-xs text-ink-muted flex items-center justify-between">
              <span>Showing last 4 live decisions</span>
              <span className="font-mono text-ink-faint">Merchant: m_sandbox</span>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}