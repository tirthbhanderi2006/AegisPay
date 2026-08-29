"use client";

import {
  BrainCircuit,
  Fingerprint,
  Gavel,
  KeyRound,
  Scale,
  Truck,
} from "lucide-react";
import { AccordionSection, Badge, ConfidenceBar, KeyValue, Panel } from "./legacy-ui";
import { formatMoney, formatUtc, cn } from "@/lib/format";
import {
  COST_TO_FIGHT_USD,
  DISPUTE_FEE_USD,
  type DisputeDetail,
} from "@/lib/types";

function TelemetrySections({ detail }: { detail: DisputeDetail }) {
  const t = detail.event_payload.telemetry;
  const flags = detail.result.rule_engine.evidence_flags;
  const qualifying = detail.result.rule_engine.qualifying_transactions;
  const na = <span className="text-ink-faint">Not available</span>;

  return (
    <>
      <AccordionSection title="Gateway Authentication" icon={<KeyRound size={13} aria-hidden="true" />} defaultOpen>
        <dl>
          <KeyValue
            k="3DS ECI"
            v={
              t.three_ds_eci ? (
                <span className={flags.three_ds_completed ? "text-fight" : "text-settle"}>
                  {t.three_ds_eci} — {t.three_ds_eci === "05" ? "Authenticated (liability shift)" : t.three_ds_status ?? "Attempted"}
                </span>
              ) : (
                na
              )
            }
          />
          <KeyValue
            k="AVS Match"
            v={t.avs_result ? `${t.avs_result} — ${t.avs_result === "Y" ? "Full address match" : "Partial / unavailable"}` : na}
          />
          <KeyValue
            k="CVV Match"
            v={t.cvv_check ? `${t.cvv_check} — ${t.cvv_check === "M" ? "Match" : "No match"}` : na}
          />
          <KeyValue k="IP Address" v={t.ip_address ?? na} />
          <KeyValue k="Card Last 4" v={t.card_last4 ?? na} />
        </dl>
      </AccordionSection>

      <AccordionSection title="Merchant History & Device Matching" icon={<Fingerprint size={13} aria-hidden="true" />}>
        <dl>
          <KeyValue
            k="Device Hash"
            v={<span className={cn(flags.identifier_match_with_history && "text-fight")}>{t.device_hash ?? na}</span>}
          />
          <KeyValue
            k="Identifier Match vs History"
            v={
              <Badge tone={flags.identifier_match_with_history ? "fight" : "escalate"}>
                {flags.identifier_match_with_history ? "Hard match found" : "No match"}
              </Badge>
            }
          />
          <KeyValue k="Lifetime Orders" v={t.lifetime_orders != null ? String(t.lifetime_orders) : na} />
        </dl>
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            120–365 Day Prior Undisputed Orders ({qualifying.length})
          </p>
          {qualifying.length === 0 ? (
            <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 font-mono text-[11px] text-red-700">
              None qualified — CE3.0 chain broken
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {qualifying.map((tx: any) => (
                <li
                  key={tx.transaction_id ?? tx.days_before_dispute}
                  className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 font-mono text-[11px] text-emerald-800"
                >
                  <span className="text-fight">{tx.transaction_id}</span>
                  <span className="ml-auto text-ink-muted">{tx.days_before_dispute}d prior</span>
                  <span className="text-ink-faint">via {tx.matched_identifier.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AccordionSection>

      <AccordionSection title="Fulfillment & Delivery Proof" icon={<Truck size={13} aria-hidden="true" />}>
        <dl>
          <KeyValue k="Carrier" v={t.shipping_carrier ?? na} />
          <KeyValue k="Tracking #" v={t.tracking_number ?? na} />
          <KeyValue k="Delivered At" v={formatUtc(t.delivered_at)} />
          <KeyValue
            k="Signature"
            v={
              t.signature_name ? (
                <span className="text-fight">{t.signature_name} — named recipient</span>
              ) : (
                <span className="text-escalate">None captured</span>
              )
            }
          />
          <KeyValue
            k="Physical Proof Strength"
            v={
              <Badge tone={flags.physical_delivery_proof ? "fight" : "settle"}>
                {flags.physical_delivery_proof ? "Strong (carrier + signature)" : "Weak"}
              </Badge>
            }
          />
          <KeyValue k="Fulfillment Type" v={t.fulfillment_type ?? na} />
        </dl>
      </AccordionSection>
    </>
  );
}

function EvMathCard({ detail }: { detail: DisputeDetail }) {
  const r = detail.result;
  const amount = detail.event_payload.amount;
  const p = r.win_probability;
  const computed =
    p * amount - (1 - p) * (amount + DISPUTE_FEE_USD) - COST_TO_FIGHT_USD;

  return (
    <div className="rounded-lg border border-line bg-surface-overlay/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        <Scale size={12} aria-hidden="true" />
        Deterministic Expected-Value Evaluation
      </p>
      <p className="font-mono text-[11px] leading-relaxed text-ink-muted">
        EV<sub>fight</sub> = p·A − (1−p)(A + fee) − cost
      </p>
      <p className="mt-1.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink">
        = {p.toFixed(2)} · {formatMoney(amount)} − {(1 - p).toFixed(2)} · ({formatMoney(amount)} + $
        {DISPUTE_FEE_USD}) − ${COST_TO_FIGHT_USD}
        {"\n"}= <span className={computed >= r.expected_value_settle ? "text-fight" : "text-escalate"}>
          {formatMoney(computed)}
        </span>{" "}
        <span className="text-ink-faint">vs EV_settle = −{formatMoney(amount)}</span>
      </p>
      <div className="mt-2.5 border-t border-line pt-2.5">
        <p className="text-xs leading-relaxed text-ink-muted">
          {r.decision === "fight" && (
            <>
              <span className="font-semibold text-fight">Router chose FIGHT:</span> contesting yields a higher
              expected value than accepting the chargeback{r.rule_engine.ce3_qualified ? ", reinforced by a qualified CE3.0 evidence chain." : "."}
            </>
          )}
          {r.decision === "settle" && (
            <>
              <span className="font-semibold text-settle">Router chose SETTLE:</span> modeled win probability is too low for the
              expected recovery to cover preparation cost plus chargeback risk.
            </>
          )}
          {r.decision === "escalate" && (
            <>
              <span className="font-semibold text-escalate">Router chose ESCALATE:</span> claim classification is uncertain, so
              economic routing was overridden in favor of human review.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function AdversarialTrail({ detail }: { detail: DisputeDetail }) {
  const trail = detail.result.audit_trail;
  if (trail.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface-overlay/60 px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
        No draft⇄audit loop ran for this dispute — the router resolved it before dossier generation.
      </p>
    );
  }
  return (
    <ol className="relative flex flex-col gap-3 pl-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line-strong">
      {[...trail].reverse().map((audit) => (
        <li key={audit.iteration} className="animate-fade-up relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute -left-4 top-1.5 h-3.5 w-3.5 rounded-full border-2",
              audit.passed ? "border-emerald-500 bg-emerald-100 shadow-sm" : "border-amber-500 bg-amber-100"
            )}
          />
          <div className="rounded-lg border border-line bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-ink">
                Defense Drafter — Iteration {audit.iteration}
              </span>
              {audit.passed ? (
                <Badge tone="fight">PASSED</Badge>
              ) : (
                <Badge tone="settle">REVISION REQUIRED</Badge>
              )}
              <span className="ml-auto">
                <ConfidenceBar score={audit.confidence_score} />
              </span>
            </div>
            {audit.deficiencies.length > 0 ? (
              <div className="mt-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-settle">
                  Adversarial Auditor — flagged deficiencies
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ink-muted">
                  {audit.deficiencies.map((d: any) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-snug text-fight">
                Adversarial auditor approved the dossier with no material gaps.
              </p>
            )}
            {audit.suggested_revisions.length > 0 ? (
              <div className="mt-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  Prescribed revisions
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ink-faint">
                  {audit.suggested_revisions.map((s: any) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AgentReasoningView({ detail }: { detail: DisputeDetail | null }) {
  if (!detail) {
    return (
      <Panel title="Telemetry & Agent Reasoning" icon={<BrainCircuit size={14} aria-hidden="true" />}>
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-center">
          <BrainCircuit size={22} className="text-ink-faint" aria-hidden="true" />
          <p className="text-sm text-ink-muted">Select a dispute to inspect agent reasoning</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Telemetry & Agent Reasoning"
      icon={<BrainCircuit size={14} aria-hidden="true" />}
      actions={<Badge tone="info">{detail.dispute_id}</Badge>}
      bodyClassName="p-3 space-y-3"
    >
      <TelemetrySections detail={detail} />
      <EvMathCard detail={detail} />
      <div>
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          <Gavel size={12} aria-hidden="true" />
          Draft ⇄ Audit Loop ({detail.result.iterations_used}/{detail.result.max_iterations} iterations)
        </p>
        <AdversarialTrail detail={detail} />
      </div>
    </Panel>
  );
}
