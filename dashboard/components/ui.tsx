"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

export function Panel({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface-raised shadow-card",
        className
      )}
      aria-label={title}
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        {icon ? <span className="text-azure">{icon}</span> : null}
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          {title}
        </h2>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "fight" | "settle" | "escalate" | "neutral" | "info";
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    fight: "border-emerald-200 bg-emerald-50 text-emerald-700",
    settle: "border-amber-200 bg-amber-50 text-amber-700",
    escalate: "border-red-200 bg-red-50 text-red-700",
    info: "border-blue-200 bg-blue-50 text-azure",
    neutral: "border-line-strong bg-slate-50 text-ink-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger" | "ghost";
  size?: "sm" | "md";
}) {
  const variants: Record<string, string> = {
    default:
      "border border-line-strong bg-white text-slate-700 hover:border-azure/50 hover:bg-blue-50/60 hover:text-azure",
    primary:
      "border border-azure bg-azure text-white hover:bg-azureDeep",
    danger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    ghost: "text-ink-muted hover:text-ink hover:bg-slate-100",
  };
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure",
        "disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-lg border border-line bg-slate-100 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors duration-200",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-azure",
            value === option.value
              ? "bg-white text-azure shadow-sm"
              : "text-ink-muted hover:text-ink"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function AccordionSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <button
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-2 bg-surface-overlay/60 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-overlay focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-azure"
      >
        {icon ? <span className="text-azure">{icon}</span> : null}
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">
          {title}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn("ml-auto text-ink-faint transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open ? <div className="animate-fade-up bg-white px-3 py-3">{children}</div> : null}
    </div>
  );
}

export function KeyValue({ k, v, mono = true }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/70 py-1.5 last:border-none">
      <dt className="shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">{k}</dt>
      <dd className={cn("break-all text-right text-xs text-ink", mono && "font-mono")}>{v}</dd>
    </div>
  );
}

export function NetworkChip({ network }: { network: string }) {
  const styles: Record<string, string> = {
    VISA: "border-indigo-200 bg-indigo-50 text-indigo-700",
    MASTERCARD: "border-orange-200 bg-orange-50 text-orange-700",
    NPCI: "border-emerald-200 bg-emerald-50 text-emerald-700",
    UNKNOWN: "border-line-strong bg-slate-50 text-ink-muted",
  };
  const labels: Record<string, string> = {
    VISA: "VISA",
    MASTERCARD: "MC",
    NPCI: "NPCI",
    UNKNOWN: "—",
  };
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded border px-1.5 font-mono text-[9px] font-bold tracking-widest",
        styles[network] ?? styles.UNKNOWN
      )}
    >
      {labels[network] ?? network.slice(0, 6)}
    </span>
  );
}

export function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Confidence ${pct} percent`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            score >= 0.85 ? "bg-fight" : score >= 0.5 ? "bg-settle" : "bg-escalate"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-ink">{score.toFixed(2)}</span>
    </div>
  );
}
