"use client";

import { CircleDollarSign, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import { Panel } from "./legacy-ui";
import { formatMoney, formatPercent } from "@/lib/format";
import type { DisputeRecord, Role } from "@/lib/types";

export interface PortfolioMetrics {
  totalDisputedVolume: number;
  recovered: number;
  feesAvoided: number;
  foughtCount: number;
  settledCount: number;
  escalatedCount: number;
  avgWinProbabilityFought: number;
  autoResolutionRate: number;
  currency: string;
}

export function computeMetrics(
  disputes: DisputeRecord[],
  amounts: Record<string, number>
): PortfolioMetrics {
  let totalDisputedVolume = 0;
  let recovered = 0;
  let feesAvoided = 0;
  let foughtCount = 0;
  let settledCount = 0;
  let escalatedCount = 0;
  let winProbSum = 0;
  let currency = "USD";

  for (const dispute of disputes) {
    const amount = amounts[dispute.dispute_id] ?? 0;
    if (dispute.final_status === "DISPUTE_CONTESTED_DOSSIER_FINALIZED") {
      foughtCount += 1;
      totalDisputedVolume += amount;
      recovered += amount;
      winProbSum += dispute.win_probability;
    } else if (dispute.final_status === "AUTO_SETTLED_MERCHANT_NOTIFIED") {
      settledCount += 1;
      totalDisputedVolume += amount;
      feesAvoided += 15;
    } else {
      escalatedCount += 1;
      totalDisputedVolume += amount;
    }
    currency = "USD";
  }

  const decided = foughtCount + settledCount + escalatedCount;
  return {
    totalDisputedVolume,
    recovered,
    feesAvoided,
    foughtCount,
    settledCount,
    escalatedCount,
    avgWinProbabilityFought: foughtCount > 0 ? winProbSum / foughtCount : 0,
    autoResolutionRate: decided > 0 ? (foughtCount + settledCount) / decided : 0,
    currency,
  };
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-overlay/50 p-3 transition-colors duration-200 hover:border-line-strong">
      <div className="flex items-center gap-1.5">
        <span className={tone}>{icon}</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{label}</p>
      </div>
      <p className={`mt-2 font-mono text-xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{sub}</p>
    </div>
  );
}

export function MetricsOverview({
  metrics,
  role,
}: {
  metrics: PortfolioMetrics;
  role: Role;
}) {
  const gateway = [
    <MetricCard
      key="risk"
      label="Portfolio At Risk"
      value={formatMoney(metrics.totalDisputedVolume, metrics.currency)}
      sub={`${metrics.foughtCount + metrics.settledCount + metrics.escalatedCount} active chargebacks across all merchants`}
      icon={<Wallet size={13} aria-hidden="true" />}
      tone="text-azure"
    />,
    <MetricCard
      key="auto"
      label="Auto-Resolution Rate"
      value={formatPercent(metrics.autoResolutionRate)}
      sub="Handled autonomously by the LangGraph agent loop — no human touch"
      icon={<TrendingUp size={13} aria-hidden="true" />}
      tone="text-fight"
    />,
    <MetricCard
      key="escalations"
      label="Human Escalations"
      value={String(metrics.escalatedCount)}
      sub="Unknown scheme codes or exhausted audit iterations routed to review"
      icon={<ShieldAlert size={13} aria-hidden="true" />}
      tone="text-escalate"
    />,
  ];

  const merchant = [
    <MetricCard
      key="recovered"
      label="Net Revenue Recovered"
      value={formatMoney(metrics.recovered, metrics.currency)}
      sub={
        metrics.foughtCount > 0
          ? `Won dossiers at ${formatPercent(metrics.avgWinProbabilityFought)} avg modeled confidence`
          : "No contested disputes won yet"
      }
      icon={<CircleDollarSign size={13} aria-hidden="true" />}
      tone="text-fight"
    />,
    <MetricCard
      key="fees"
      label="Fees Avoided"
      value={formatMoney(metrics.feesAvoided, metrics.currency)}
      sub={`${metrics.settledCount} low-odds disputes auto-settled before the $15 chargeback fee applied`}
      icon={<TrendingUp size={13} aria-hidden="true" />}
      tone="text-settle"
    />,
    <MetricCard
      key="fought"
      label="Disputes Contested & Won"
      value={String(metrics.foughtCount)}
      sub="Full CE3.0 dossiers submitted to scheme arbitration"
      icon={<ShieldAlert size={13} aria-hidden="true" />}
      tone="text-azure"
    />,
  ];

  return (
    <Panel title={role === "gateway" ? "Gateway Risk Metrics" : "Merchant Recovery Metrics"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {role === "gateway" ? gateway : merchant}
      </div>
    </Panel>
  );
}
