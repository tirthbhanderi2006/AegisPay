"use client";

import React, { type ReactNode } from "react";
import { clsx } from "clsx";
import { Card } from "@/components/ui";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: ReactNode;
  variant?: "default" | "gold" | "emerald" | "red" | "amber" | "azure";
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  icon,
  variant = "default",
  loading = false,
}: MetricCardProps) {
  const variantStyles = {
    default: "border-line text-ink",
    gold: "border-gold/30 bg-gold/5 text-gold",
    emerald: "border-emerald/30 bg-emerald/5 text-emerald",
    red: "border-red/30 bg-red/5 text-red",
    amber: "border-amber/30 bg-amber/5 text-amber",
    azure: "border-azure/30 bg-azure/5 text-azure",
  };

  if (loading) {
    return (
      <Card variant="raised" padding="md" className="animate-pulse">
        <div className="h-4 bg-surface-overlay rounded w-1/2 mb-3" />
        <div className="h-8 bg-surface-overlay rounded w-3/4 mb-2" />
        <div className="h-3 bg-surface-overlay rounded w-1/3" />
      </Card>
    );
  }

  return (
    <Card variant="raised" padding="md" className={clsx("transition-all duration-200", variant !== "default" && variantStyles[variant])}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
        {icon && <div className="text-ink-muted">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl lg:text-3xl font-bold font-mono text-ink tracking-tight">{value}</span>
        {trend && (
          <span
            className={clsx(
              "text-xs font-mono font-medium px-1.5 py-0.5 rounded",
              trend.positive ? "text-emerald bg-emerald/10" : "text-red bg-red/10"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subValue && <p className="mt-1 text-xs text-ink-muted">{subValue}</p>}
    </Card>
  );
}
