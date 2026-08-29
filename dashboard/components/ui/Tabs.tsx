"use client";

import { useState, type ReactNode } from "react";
import { clsx } from "clsx";

export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: string | number;
  children?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: "default" | "pills" | "underline";
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Tabs({ tabs, value, onChange, variant = "default", fullWidth = false, className, children }: TabsProps) {
  const variantStyles = {
    default: "bg-surface-overlay p-1 rounded-lg",
    pills: "",
    underline: "border-b border-line",
  };

  const tabStyles = {
    default:
      "px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    pills:
      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    underline:
      "px-4 py-3 border-b-2 -mb-px text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  };

  const activeStyles = {
    default: "bg-surface-raised text-ink shadow-sm",
    pills: "bg-gold text-slate-950 shadow-sm",
    underline: "border-gold text-gold",
  };

  const inactiveStyles = {
    default: "text-ink-muted hover:text-ink hover:bg-surface-raised/50",
    pills: "text-ink-muted hover:text-ink hover:bg-surface-overlay",
    underline: "text-ink-muted hover:text-ink border-transparent",
  };

  return (
    <div className={clsx("w-full", className)} role="tablist" aria-label="Tabs">
      <div
        className={clsx(
          "flex gap-1",
          variantStyles[variant],
          fullWidth && "w-full"
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={value === tab.value}
            aria-controls={`panel-${tab.value}`}
            id={`tab-${tab.value}`}
            onClick={() => !tab.disabled && onChange(tab.value)}
            disabled={tab.disabled}
            className={clsx(
              "flex items-center gap-2 whitespace-nowrap",
              tabStyles[variant],
              value === tab.value ? activeStyles[variant] : inactiveStyles[variant],
              tab.disabled && "opacity-50 cursor-not-allowed",
              fullWidth && "flex-1 justify-center"
            )}
          >
            {tab.icon && <span className="flex-shrink-0" aria-hidden="true">{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span
                className={clsx(
                  "px-1.5 py-0.5 text-xs font-medium rounded-full",
                  value === tab.value
                    ? variant === "underline"
                      ? "bg-gold/20 text-gold"
                      : "bg-white/20 text-slate-950"
                    : "bg-surface text-ink-muted"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {children ? (
        <div className="mt-4 animate-in">{children}</div>
      ) : (
        tabs.map((tab) => (
          <div
            key={`panel-${tab.value}`}
            role="tabpanel"
            id={`panel-${tab.value}`}
            aria-labelledby={`tab-${tab.value}`}
            hidden={value !== tab.value}
            className="mt-4 animate-in"
          >
            {value === tab.value && tab.children}
          </div>
        ))
      )}
    </div>
  );
}