"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "gold";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  icon?: ReactNode;
}

const variantStyles = {
  default: "bg-surface-overlay text-ink-muted border border-line",
  success: "bg-emerald/15 text-emerald-light border border-emerald/30",
  warning: "bg-amber/15 text-amber-light border border-amber/30",
  danger: "bg-red/15 text-red-light border border-red/30",
  info: "bg-azure/15 text-azure-light border border-azure/30",
  neutral: "bg-surface-overlay text-ink-muted border border-line",
  gold: "bg-gold/15 text-gold-light border border-gold/30",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-sm gap-1.5",
  lg: "px-3 py-1.5 text-base gap-2",
};

const dotColors = {
  default: "bg-ink-muted",
  success: "bg-emerald",
  warning: "bg-amber",
  danger: "bg-red",
  info: "bg-azure",
  neutral: "bg-ink-muted",
  gold: "bg-gold",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full",
        "transition-colors duration-150",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && <span className={clsx("w-1.5 h-1.5 rounded-full", dotColors[variant])} aria-hidden="true" />}
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const configMap: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "gold"; label: string; dot?: boolean }> = {
    operational: { variant: "success", label: "OPERATIONAL", dot: true },
    healthy: { variant: "success", label: "HEALTHY", dot: true },
    success: { variant: "success", label: "SUCCESS", dot: true },
    active: { variant: "success", label: "ACTIVE", dot: true },
    completed: { variant: "success", label: "COMPLETED", dot: false },
    processed: { variant: "success", label: "PROCESSED", dot: true },
    already_processed_idempotent: { variant: "info", label: "IDEMPOTENT", dot: true },
    degraded: { variant: "warning", label: "DEGRADED", dot: true },
    warning: { variant: "warning", label: "WARNING", dot: true },
    pending: { variant: "info", label: "PENDING", dot: true },
    unavailable: { variant: "danger", label: "UNAVAILABLE", dot: true },
    unhealthy: { variant: "danger", label: "UNHEALTHY", dot: true },
    failed: { variant: "danger", label: "FAILED", dot: true },
    revoked: { variant: "neutral", label: "REVOKED", dot: false },
  };

  const config = (status && configMap[status.toLowerCase()]) || {
    variant: "default" as const,
    label: (status || "UNKNOWN").toUpperCase().replace(/_/g, " "),
    dot: false,
  };

  return <Badge variant={config.variant} size={size} dot={config.dot} className={className}>{config.label}</Badge>;
}

export function DecisionBadge({
  decision,
  size = "md",
  className,
}: {
  decision?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const configMap: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "gold"; label: string }> = {
    ALLOW: { variant: "success", label: "ALLOW" },
    CHALLENGE: { variant: "warning", label: "CHALLENGE" },
    BLOCK: { variant: "danger", label: "BLOCK" },
    MANUAL_HOLD: { variant: "info", label: "MANUAL HOLD" },
  };

  const config = (decision && configMap[decision.toUpperCase()]) || {
    variant: "neutral" as const,
    label: decision || "UNKNOWN",
  };

  return <Badge variant={config.variant} size={size} className={className}>{config.label}</Badge>;
}

export function RiskLevelBadge({
  level,
  size = "md",
  className,
}: {
  level?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const configMap: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "gold"; label: string }> = {
    LOW: { variant: "success", label: "LOW" },
    MEDIUM: { variant: "warning", label: "MEDIUM" },
    HIGH: { variant: "danger", label: "HIGH" },
  };

  const config = (level && configMap[level.toUpperCase()]) || {
    variant: "neutral" as const,
    label: level || "UNKNOWN",
  };

  return <Badge variant={config.variant} size={size} className={className}>{config.label}</Badge>;
}