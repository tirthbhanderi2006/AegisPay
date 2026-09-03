"use client";

import React from "react";
import { clsx } from "clsx";

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: "pills" | "line" | "segmented";
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Tabs({
  tabs,
  value,
  onChange,
  variant = "line",
  fullWidth = false,
  className,
  children,
}: TabsProps) {
  return (
    <div className={clsx("w-full space-y-3", className)}>
      <div
        role="tablist"
        className={clsx(
          "flex items-center select-none",
          variant === "line" && "border-b border-line gap-4",
          variant === "pills" && "p-0.5 bg-surface-subtle border border-line rounded-lg gap-1",
          variant === "segmented" && "p-1 bg-surface-subtle rounded border border-line gap-1",
          fullWidth && "w-full"
        )}
      >
        {tabs.map((tab) => {
          const isActive = value === tab.value;

          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.value)}
              className={clsx(
                "inline-flex items-center justify-center font-sans transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                variant === "line" && [
                  "pb-2.5 pt-1 text-xs font-medium border-b-2 -mb-px",
                  isActive
                    ? "border-accent text-accent font-semibold"
                    : "border-transparent text-ink-muted hover:text-ink hover:border-line-strong",
                ],
                variant === "pills" && [
                  "px-3 py-1 text-xs font-medium rounded-md",
                  isActive
                    ? "bg-surface text-ink font-semibold shadow-subtle border border-line"
                    : "text-ink-muted hover:text-ink",
                ],
                variant === "segmented" && [
                  "px-3 py-1 text-xs rounded",
                  isActive
                    ? "bg-surface text-ink font-semibold shadow-subtle"
                    : "text-ink-muted hover:text-ink",
                ],
                fullWidth && "flex-1"
              )}
            >
              {tab.icon && <span className="mr-1.5 flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && <span className="ml-1.5">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {children && <div>{children}</div>}
    </div>
  );
}