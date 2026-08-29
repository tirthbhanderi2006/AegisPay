"use client";

import React from "react";
import { clsx } from "clsx";
import type { RiskLevel } from "@/lib/types";

interface RiskScoreGaugeProps {
  score: number; // 0.0 to 1.0 or 0 to 100
  level?: RiskLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RiskScoreGauge({
  score,
  level,
  size = "md",
  showLabel = true,
}: RiskScoreGaugeProps) {
  // Normalize to 0 - 100
  const normalizedScore = score <= 1.0 ? Math.round(score * 10000) / 100 : Math.round(score * 100) / 100;
  
  const computedLevel: RiskLevel =
    level || (normalizedScore >= 70 ? "HIGH" : normalizedScore >= 40 ? "MEDIUM" : "LOW");

  const colorClass =
    computedLevel === "HIGH"
      ? "text-red stroke-red fill-red"
      : computedLevel === "MEDIUM"
      ? "text-amber stroke-amber fill-amber"
      : "text-emerald stroke-emerald fill-emerald";

  const strokeColor =
    computedLevel === "HIGH" ? "#DC2626" : computedLevel === "MEDIUM" ? "#D97706" : "#059669";

  const radius = size === "sm" ? 28 : size === "lg" ? 54 : 40;
  const strokeWidth = size === "sm" ? 5 : size === "lg" ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative flex items-center justify-center">
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-surface-overlay"
          />
          {/* Calibrated score progress */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={clsx(
              "font-mono font-bold tracking-tight text-ink",
              size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg"
            )}
          >
            {normalizedScore.toFixed(1)}
          </span>
          {size !== "sm" && (
            <span className="text-[10px] text-ink-muted uppercase font-mono tracking-widest">
              / 100
            </span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              computedLevel === "HIGH" ? "bg-red" : computedLevel === "MEDIUM" ? "bg-amber" : "bg-emerald"
            )}
          />
          <span
            className={clsx(
              "text-xs font-semibold uppercase tracking-wider font-mono",
              computedLevel === "HIGH" ? "text-red" : computedLevel === "MEDIUM" ? "text-amber" : "text-emerald"
            )}
          >
            {computedLevel} RISK
          </span>
        </div>
      )}
    </div>
  );
}
