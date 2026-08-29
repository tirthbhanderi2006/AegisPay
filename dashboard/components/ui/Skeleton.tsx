"use client";

import { clsx } from "clsx";

export interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export function Skeleton({ variant = "text", width, height, className, count = 1 }: SkeletonProps) {
  const baseStyles = "animate-pulse bg-surface-overlay rounded";

  const variantStyles = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
    card: "rounded-xl",
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={clsx(baseStyles, variantStyles[variant], className)}
      style={{
        width: width || (variant === "text" ? "100%" : undefined),
        height: height || (variant === "circular" ? width : undefined),
      }}
      aria-hidden="true"
    />
  ));

  return <>{items}</>;
}

export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton variant="text" width="60%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, row) => (
            <tr key={row} className="border-b border-line/50">
              {Array.from({ length: columns }).map((_, col) => (
                <td key={col} className="px-4 py-3">
                  <Skeleton variant="text" width={col === 0 ? "80%" : "60%"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-surface-raised border border-line rounded-xl p-5 space-y-3 animate-in">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="30%" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export function PipelineStepSkeleton({ steps = 5 }: { steps?: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {Array.from({ length: steps }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex items-center">
            <Skeleton variant="circular" width={32} height={32} />
            {i < steps - 1 && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 w-12 h-0.5 bg-surface-overlay" />
            )}
          </div>
          <Skeleton variant="text" width={80} height={12} />
        </div>
      ))}
    </div>
  );
}