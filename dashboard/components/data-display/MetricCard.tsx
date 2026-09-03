"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: React.ReactNode;
  status?: "normal" | "success" | "warning" | "danger";
  className?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon,
  status = "normal",
  className = "",
}: MetricCardProps) {
  const getStatusBorder = () => {
    switch (status) {
      case "success":
        return "border-emerald-border bg-emerald-bg/30";
      case "warning":
        return "border-amber-border bg-amber-bg/30";
      case "danger":
        return "border-red-border bg-red-bg/30";
      default:
        return "border-line bg-surface";
    }
  };

  return (
    <Card
      variant="flat"
      padding="md"
      className={`border rounded-lg transition-colors ${getStatusBorder()} ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-ink">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-ink-muted font-sans font-normal">
            {subValue}
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-2 pt-2 border-t border-line/60 flex items-center gap-1.5 text-xs">
          {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-emerald" />}
          {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-red" />}
          {trend === "neutral" && <Minus className="w-3.5 h-3.5 text-ink-muted" />}
          <span className="text-ink-secondary text-[11px]">{trendLabel}</span>
        </div>
      )}
    </Card>
  );
}
