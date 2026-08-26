"use client";

import { Clock, Inbox } from "lucide-react";
import { NetworkChip, Panel } from "./ui";
import { formatMoney, relativeTime, cn } from "@/lib/format";
import { FINAL_STATUS_LABELS, type DisputeRecord } from "@/lib/types";

type QueueTone = "fight" | "settle" | "escalate" | "pending";

interface QueueItem {
  record: DisputeRecord;
  tone: QueueTone;
}

function toneFor(finalStatus: string): QueueTone {
  if (finalStatus === "DISPUTE_CONTESTED_DOSSIER_FINALIZED") return "fight";
  if (finalStatus === "AUTO_SETTLED_MERCHANT_NOTIFIED") return "settle";
  if (finalStatus.startsWith("ESCALATED")) return "escalate";
  return "pending";
}

function chipLabel(item: QueueItem): { text: string; className: string } {
  switch (item.tone) {
    case "fight":
      return { text: `FIGHT · ${Math.round(item.record.win_probability * 100)}% win prob`, className: "border-emerald-300 bg-emerald-50 text-emerald-700" };
    case "settle":
      return { text: "SETTLE · $15 fee avoided", className: "border-amber-300 bg-amber-50 text-amber-700" };
    case "escalate":
      return { text: "ESCALATE · human review", className: "border-red-300 bg-red-50 text-red-700" };
    default:
      return { text: "PROCESSING…", className: "border-line-strong bg-white text-ink-muted animate-pulse-glow" };
  }
}

export function DisputeList({
  disputes,
  amounts,
  selectedId,
  onSelect,
}: {
  disputes: DisputeRecord[];
  amounts: Record<string, number>;
  selectedId: string | null;
  onSelect: (disputeId: string) => void;
}) {
  const sorted = [...disputes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Panel
      title="Live Dispute Feed"
      icon={<Inbox size={14} aria-hidden="true" />}
      actions={
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          {sorted.length} record{sorted.length === 1 ? "" : "s"}
        </span>
      }
      bodyClassName="p-2"
    >
      {sorted.length === 0 ? (
        <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-center">
          <Clock size={20} className="text-ink-faint" aria-hidden="true" />
          <p className="text-sm text-ink-muted">No disputes processed yet</p>
          <p className="text-xs text-ink-faint">Trigger a scenario above to watch the agents work</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((record) => {
            const item: QueueItem = { record, tone: toneFor(record.final_status) };
            const chip = chipLabel(item);
            const isSelected = record.dispute_id === selectedId;
            return (
              <li key={record.dispute_id}>
                <button
                  onClick={() => onSelect(record.dispute_id)}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "w-full cursor-pointer rounded-lg border p-3 text-left transition-all duration-200",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fight",
                    isSelected
                      ? "border-blue-300 bg-blue-50"
                      : "border-line bg-white hover:border-line-strong hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <NetworkChip network={record.network} />
                    <span className="truncate font-mono text-xs font-semibold text-ink">
                      {record.dispute_id}
                    </span>
                    <span className="ml-auto flex items-center gap-0.5 whitespace-nowrap font-mono text-[10px] text-ink-faint">
                      <Clock size={10} aria-hidden="true" />
                      {relativeTime(record.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-mono text-sm font-semibold text-ink">
                      {formatMoney(amounts[record.dispute_id] ?? 0)}
                    </span>
                    <span className="rounded border border-line-strong px-1 py-0.5 font-mono text-[9px] tracking-wider text-ink-muted">
                      RC {record.reason_code}
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                        chip.className
                      )}
                    >
                      {chip.text}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-[11px] text-ink-faint">
                    {FINAL_STATUS_LABELS[record.final_status] ?? record.final_status}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
