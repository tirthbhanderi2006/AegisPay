"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

export const PIPELINE_STEPS = [
  "Parsing Webhook",
  "Evaluating CE3.0",
  "Adversarial Audit",
  "Finalizing",
] as const;

export function PipelineSteps({
  active,
  currentStep,
  completed,
}: {
  active: boolean;
  currentStep: number;
  completed: boolean;
}) {
  if (!active && !completed) return null;
  return (
    <div
      aria-live="polite"
      aria-label="LangGraph pipeline status"
      className={cn(
        "flex items-center gap-0 overflow-x-auto border-b px-4 py-2.5 lg:px-6",
        completed ? "border-emerald-200 bg-emerald-50/60" : "border-line bg-white"
      )}
    >
      {PIPELINE_STEPS.map((step, index) => {
        const done = completed || index < currentStep;
        const isCurrent = !completed && index === currentStep;
        return (
          <div key={step} className="flex shrink-0 items-center">
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cn("mx-2 h-px w-6 sm:w-10", done ? "bg-emerald-400" : "bg-line-strong")}
              />
            ) : null}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-300",
                done && "border-emerald-300 bg-emerald-50 text-emerald-700",
                isCurrent && "animate-pulse-glow border-blue-300 bg-blue-50 text-azure",
                !done && !isCurrent && "border-line-strong bg-white text-ink-faint"
              )}
            >
              {done ? (
                <Check size={11} aria-hidden="true" />
              ) : isCurrent ? (
                <Loader2 size={11} className="animate-spin" aria-hidden="true" />
              ) : (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              )}
              {step}
            </span>
          </div>
        );
      })}
      <span className="ml-auto pl-4 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        {completed ? "Complete" : "LangGraph executing…"}
      </span>
    </div>
  );
}
