"use client";

import React from "react";
import type { RiskLevel, DecisionAction } from "@/lib/types";

export interface RiskScoreGaugeProps {
  score: number; // 0.0 to 1.0 or 0 to 100
  level?: RiskLevel | string;
  decision?: DecisionAction | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RiskScoreGauge({
  score,
  level,
  decision,
  size = "md",
  className = "",
}: RiskScoreGaugeProps) {
  // Normalize score to 0..100
  const normalizedScore = score <= 1.0 && score > 0 ? Math.round(score * 1000) / 10 : Math.round(score * 10) / 10;

  const sizeConfigs = {
    sm: { dimension: 70, stroke: 5, fontSize: "text-sm", labelSize: "text-[9px]" },
    md: { dimension: 110, stroke: 7, fontSize: "text-2xl", labelSize: "text-[10px]" },
    lg: { dimension: 150, stroke: 9, fontSize: "text-3xl", labelSize: "text-xs" },
  };

  const { dimension, stroke, fontSize, labelSize } = sizeConfigs[size];
  const radius = (dimension - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(normalizedScore, 100) / 100) * circumference;

  const getColor = () => {
    if (normalizedScore >= 70) return { stroke: "#B91C1C", text: "text-red", bg: "bg-red-bg" };
    if (normalizedScore >= 40) return { stroke: "#B45309", text: "text-amber", bg: "bg-amber-bg" };
    return { stroke: "#15803D", text: "text-emerald", bg: "bg-emerald-bg" };
  };

  const color = getColor();

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="transform -rotate-90">
          {/* Background track circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke="#E5E5E3"
            strokeWidth={stroke}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={color.stroke}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-mono font-bold tracking-tight text-ink ${fontSize}`}>
            {normalizedScore.toFixed(1)}
          </span>
          <span className={`font-mono text-ink-muted uppercase ${labelSize}`}>
            / 100
          </span>
        </div>
      </div>

      {level && (
        <span className={`mt-2 font-mono font-bold text-xs uppercase tracking-wider ${color.text}`}>
          {level} RISK
        </span>
      )}
    </div>
  );
}
