"use client";

import React from "react";
import { clsx } from "clsx";
import type { DecisionAction, RiskLevel } from "@/lib/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "neutral" | "info" | "success" | "warning" | "danger" | "accent" | "gold";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-surface-subtle text-ink-secondary border border-line",
    neutral: "bg-surface-subtle text-ink-muted border border-line",
    info: "bg-accent-subtle text-accent border border-accent-line",
    accent: "bg-accent text-white border border-accent",
    success: "bg-emerald-bg text-emerald border border-emerald-border",
    warning: "bg-amber-bg text-amber border border-amber-border",
    danger: "bg-red-bg text-red border border-red-border",
    gold: "bg-amber-bg text-amber border border-amber-border",
  };

  const sizeStyles = {
    sm: "px-1.5 py-0.5 text-[10px] font-mono",
    md: "px-2 py-0.5 text-xs font-mono",
    lg: "px-2.5 py-1 text-xs font-mono",
  };

  const dotColors = {
    default: "bg-ink-muted",
    neutral: "bg-ink-muted",
    info: "bg-accent",
    accent: "bg-white",
    success: "bg-emerald",
    warning: "bg-amber",
    danger: "bg-red",
    gold: "bg-amber",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded font-medium transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export function DecisionBadge({
  decision,
  size = "md",
  className,
}: {
  decision: DecisionAction | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const styles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    ALLOW: {
      bg: "bg-emerald-bg",
      text: "text-emerald",
      border: "border-emerald-border",
      label: "ALLOW",
    },
    CHALLENGE: {
      bg: "bg-amber-bg",
      text: "text-amber",
      border: "border-amber-border",
      label: "CHALLENGE",
    },
    BLOCK: {
      bg: "bg-red-bg",
      text: "text-red",
      border: "border-red-border",
      label: "BLOCK",
    },
    MANUAL_HOLD: {
      bg: "bg-surface-subtle",
      text: "text-ink-secondary",
      border: "border-line",
      label: "MANUAL HOLD",
    },
  };

  const current = styles[decision] || {
    bg: "bg-surface-subtle",
    text: "text-ink-muted",
    border: "border-line",
    label: decision,
  };

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-3 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded font-mono font-bold uppercase tracking-wider border",
        current.bg,
        current.text,
        current.border,
        sizeClasses[size],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {current.label}
    </span>
  );
}

export function RiskLevelBadge({
  level,
  size = "md",
  className,
}: {
  level: RiskLevel | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    LOW: {
      bg: "bg-emerald-bg",
      text: "text-emerald",
      border: "border-emerald-border",
    },
    MEDIUM: {
      bg: "bg-amber-bg",
      text: "text-amber",
      border: "border-amber-border",
    },
    HIGH: {
      bg: "bg-red-bg",
      text: "text-red",
      border: "border-red-border",
    },
  };

  const current = styles[level] || {
    bg: "bg-surface-subtle",
    text: "text-ink-muted",
    border: "border-line",
  };

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded font-mono font-semibold uppercase tracking-wider border",
        current.bg,
        current.text,
        current.border,
        sizeClasses[size],
        className
      )}
    >
      {level} RISK
    </span>
  );
}

export function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status: "operational" | "degraded" | "unavailable" | "healthy" | "unhealthy" | "active" | "revoked" | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const isHealthy = ["operational", "healthy", "active", "success", "processed"].includes(status.toLowerCase());
  const isDegraded = ["degraded", "warning", "pending", "already_processed_idempotent"].includes(status.toLowerCase());

  const style = isHealthy
    ? "bg-emerald-bg text-emerald border-emerald-border"
    : isDegraded
    ? "bg-amber-bg text-amber border-amber-border"
    : "bg-red-bg text-red border-red-border";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded font-mono font-semibold text-[10px] uppercase tracking-wider border px-2 py-0.5",
        style,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}