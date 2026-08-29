"use client";

import {
  BadgeCheck,
  Check,
  Copy,
  FileText,
  Lightbulb,
  Printer,
  ScrollText,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, KeyValue, Panel } from "./legacy-ui";
import { formatMoney, formatUtc, sha256Hex, cn } from "@/lib/format";
import type { DisputeDetail } from "@/lib/types";

function HashBlock({ payload }: { payload: unknown }) {
  const [hash, setHash] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sha256Hex(JSON.stringify(payload)).then((h) => {
      if (!cancelled) setHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const copy = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-overlay/70 px-3 py-2">
      <BadgeCheck size={14} className="shrink-0 text-fight" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-faint">
          SHA-256 Evidence Integrity Audit Hash
        </p>
        <p className="truncate font-mono text-[11px] text-fight">{hash || "computing…"}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={copy} aria-label="Copy audit hash to clipboard">
        {copied ? <Check size={13} className="text-fight" aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function DossierDocument({ detail }: { detail: DisputeDetail }) {
  const dossier = detail.result.dossier;
  if (!dossier) return null;
  const t = detail.event_payload.telemetry;

  return (
    <div className="print-area animate-fade-up overflow-hidden rounded-xl border border-line bg-zinc-50 text-zinc-900 shadow-pop">
      <div className="border-b-4 border-double border-zinc-800 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
              Card Scheme Arbitration Dossier
            </p>
            <h3 className="mt-1 text-lg font-bold leading-tight">{dossier.dispute_classification}</h3>
          </div>
          <span className="rounded border border-zinc-400 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
            {detail.result.network}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <div>
            <dt className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Merchant</dt>
            <dd className="text-xs font-semibold">{t.customer_name ?? "Not available"}</dd>
          </div>
          <div>
            <dt className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Disputed Amount</dt>
            <dd className="text-xs font-semibold">
              {formatMoney(detail.event_payload.amount, detail.event_payload.currency)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Reason Code</dt>
            <dd className="text-xs font-semibold">
              {detail.result.reason_code} · {detail.result.claim_type.replace(/_/g, " ")}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[8px] uppercase tracking-widest text-zinc-500">Dispute Txn</dt>
            <dd className="truncate text-xs font-semibold">{detail.event_payload.disputed_transaction_id}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-5 px-6 py-5">
        <section>
          <h4 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Compelling Evidence Type
          </h4>
          <p className="border-l-4 border-emerald-600 pl-3 text-sm font-semibold text-emerald-800">
            {dossier.compelling_evidence_type}
          </p>
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Executive Summary
          </h4>
          <p className="text-sm leading-relaxed text-zinc-700">{dossier.executive_summary}</p>
        </section>

        <section>
          <h4 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Evidence Matrix
          </h4>
          <div className="overflow-x-auto rounded border border-zinc-300">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-zinc-200/80 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                  <th className="border-b border-zinc-300 px-2.5 py-2">Category</th>
                  <th className="border-b border-zinc-300 px-2.5 py-2">Factual Claim</th>
                  <th className="border-b border-zinc-300 px-2.5 py-2">Corroborating Log Reference</th>
                  <th className="border-b border-zinc-300 px-2.5 py-2">Rule Satisfied</th>
                </tr>
              </thead>
              <tbody>
                {dossier.evidence_points.map((point: any) => (
                  <tr key={point.category + point.claim.slice(0, 24)} className="align-top odd:bg-white even:bg-zinc-50">
                    <td className="border-b border-zinc-200 px-2.5 py-2 font-semibold">{point.category}</td>
                    <td className="border-b border-zinc-200 px-2.5 py-2 leading-snug text-zinc-700">{point.claim}</td>
                    <td className="border-b border-zinc-200 px-2.5 py-2 font-mono text-[10px] leading-snug text-zinc-600">
                      {point.source_metric}
                    </td>
                    <td className="border-b border-zinc-200 px-2.5 py-2 leading-snug text-zinc-700">{point.rule_mapping}</td>
                  </tr>
                ))}
                {dossier.evidence_points.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2.5 py-3 text-center italic text-zinc-500">
                      No evidence points asserted.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h4 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Rebuttal Narrative
          </h4>
          {dossier.rebuttal_narrative.split(/\n\n+/).map((paragraph: any) => (
            <p key={paragraph.slice(0, 32)} className="mb-2 text-sm leading-relaxed text-zinc-700">
              {paragraph}
            </p>
          ))}
          <p className="mt-3 font-serif text-sm italic text-zinc-600">
            Respectfully submitted — AegisPay Autonomous Defense, on behalf of the merchant.
            Order ref {t.order_id ?? "Not available"} · Auth timestamp {formatUtc(t.timestamp)}
          </p>
        </section>
      </div>
    </div>
  );
}

export function DossierViewer({
  detail,
  opsDecision,
  onOpsDecision,
}: {
  detail: DisputeDetail | null;
  opsDecision: string | null;
  onOpsDecision: (disputeId: string, decision: "contest" | "accept") => void;
}) {
  if (!detail) {
    return (
      <Panel title="Output Artifact Inspector" icon={<ScrollText size={14} aria-hidden="true" />}>
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
          <FileText size={22} className="text-ink-faint" aria-hidden="true" />
          <p className="text-sm text-ink-muted">Run a scenario or select a dispute to view its artifact</p>
        </div>
      </Panel>
    );
  }

  const r = detail.result;

  if (r.final_status === "DISPUTE_CONTESTED_DOSSIER_FINALIZED" && r.dossier) {
    return (
      <Panel
        title="Output · Arbitration Dossier"
        icon={<ScrollText size={14} aria-hidden="true" />}
        actions={
          <>
            <Badge tone="fight">WON · {Math.round(r.win_probability * 100)}% conf</Badge>
            <Button
              size="sm"
              variant="primary"
              onClick={() => window.print()}
              aria-label="Print or export the official dossier as PDF"
            >
              <Printer size={13} aria-hidden="true" />
              Download Official Dossier PDF
            </Button>
          </>
        }
        bodyClassName="p-4 space-y-3"
      >
        <DossierDocument detail={detail} />
        <HashBlock payload={r.dossier} />
      </Panel>
    );
  }

  if (r.final_status === "AUTO_SETTLED_MERCHANT_NOTIFIED" && r.notice) {
    return (
      <Panel title="Output · Merchant Savings Notice" icon={<FileText size={14} aria-hidden="true" />}>
        <div className="animate-fade-up space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <Badge tone="settle">AUTO-SETTLED</Badge>
              <span className="ml-auto font-mono text-[10px] text-ink-faint">{r.notice?.notice_title}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">{r.notice?.notice_body}</p>
          </div>

          <div className="rounded-lg border border-line bg-surface-overlay/60 p-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Financial Rationale
            </p>
            <dl>
              <KeyValue k="Modeled win probability" v={`${Math.round(r.win_probability * 100)}%`} />
              <KeyValue k="EV if contested" v={<span className="text-escalate">{formatMoney(r.expected_value_fight)}</span>} />
              <KeyValue k="EV if settled now" v={<span className="text-settle">{formatMoney(r.expected_value_settle)}</span>} />
              <KeyValue k="Chargeback fee avoided" v={<span className="text-fight">$15.00</span>} />
              <KeyValue k="Amount at risk" v={formatMoney(detail.event_payload.amount, detail.event_payload.currency)} />
            </dl>
          </div>

          <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-azure" aria-hidden="true" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-azure">
                Actionable optimization tip
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{r.notice.improvement_tip}</p>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Output · Human-in-the-Loop Review" icon={<ShieldAlert size={14} aria-hidden="true" />}>
      <div className="animate-fade-up space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <Badge tone="escalate">ESCALATED — HUMAN REVIEW REQUIRED</Badge>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">{r.primary_gap}</p>
          {r.rule_engine.rejection_reasons.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ink-faint">
              {r.rule_engine.rejection_reasons.map((reason: any) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-2 rounded-lg border border-line bg-surface-overlay/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Audit flags</p>
          <dl>
            <KeyValue
              k="Classification source"
              v={
                <Badge tone={r.classification_source === "llm_fallback" ? "settle" : "fight"}>
                  {r.classification_source === "llm_fallback" ? "LLM fallback (uncertain)" : "Static scheme table"}
                </Badge>
              }
            />
            <KeyValue k="Claim type" v={r.claim_type.replace(/_/g, " ")} />
            <KeyValue k="Reason code" v={r.reason_code} />
            <KeyValue k="Iterations used" v={`${r.iterations_used} / ${r.max_iterations}`} />
          </dl>
        </div>

        {opsDecision ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border p-3",
              opsDecision === "contest"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            )}
            role="status"
          >
            <UserCheck size={15} aria-hidden="true" />
            <p className="text-xs font-medium">
              {opsDecision === "contest"
                ? "Ops decision recorded: contest manually. Case queued for the drafting agent with human override."
                : "Ops decision recorded: accept liability. Chargeback will be allowed to stand."}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onOpsDecision(r.dispute_id, "contest")}>
              Manually Approve Contest
            </Button>
            <Button variant="danger" onClick={() => onOpsDecision(r.dispute_id, "accept")}>
              Accept Liability
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
