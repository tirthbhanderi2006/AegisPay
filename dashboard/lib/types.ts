export type Decision = "fight" | "settle" | "escalate" | "pending";

export type Role = "gateway" | "merchant";

export interface EvidencePoint {
  category: string;
  claim: string;
  source_metric: string;
  rule_mapping: string;
}

export interface DossierDraft {
  executive_summary: string;
  dispute_classification: string;
  compelling_evidence_type: string;
  evidence_points: EvidencePoint[];
  rebuttal_narrative: string;
}

export interface AuditRecord {
  passed: boolean;
  confidence_score: number;
  deficiencies: string[];
  suggested_revisions: string[];
  iteration: number;
  auditor_llm_failed: boolean;
}

export interface QualifyingTransaction {
  transaction_id: string | null;
  days_before_dispute: number;
  matched_identifier: string;
}

export interface EvidenceFlags {
  three_ds_completed: boolean;
  three_ds_attempted_only: boolean;
  named_recipient_signature: boolean;
  physical_delivery_proof: boolean;
  identifier_match_with_history: boolean;
}

export interface RuleEngineResult {
  ce3_applicable: boolean;
  ce3_qualified: boolean;
  qualifying_tx_count: number;
  qualifying_transactions: QualifyingTransaction[];
  rejection_reasons: string[];
  evidence_flags: EvidenceFlags;
}

export interface MerchantNotice {
  notice_title: string;
  notice_body: string;
  improvement_tip: string;
  notice_llm_failed?: boolean;
}

export interface DisputeResult {
  dispute_id: string;
  network: string;
  reason_code: string;
  claim_type: string;
  classification_source: string;
  decision: Decision;
  final_status: string;
  iterations_used: number;
  max_iterations: number;
  win_probability: number;
  expected_value_fight: number;
  expected_value_settle: number;
  primary_gap: string;
  rule_engine: RuleEngineResult;
  dossier: DossierDraft | null;
  audit_trail: AuditRecord[];
  notice: MerchantNotice | null;
  persisted?: boolean;
  warning?: string;
}

export interface Telemetry {
  transaction_id?: string | null;
  timestamp?: string | null;
  amount?: number | null;
  currency?: string;
  ip_address?: string | null;
  device_hash?: string | null;
  card_last4?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  order_id?: string | null;
  fulfillment_type?: string | null;
  three_ds_eci?: string | null;
  three_ds_status?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  delivered_at?: string | null;
  signature_name?: string | null;
  avs_result?: string | null;
  cvv_check?: string | null;
  lifetime_orders?: number | null;
}

export interface HistoricalTransaction extends Telemetry {
  transaction_id?: string | null;
}

export interface EventPayload {
  dispute_id: string;
  network: string;
  reason_code: string;
  reason_code_description?: string | null;
  amount: number;
  currency: string;
  disputed_transaction_id: string;
  telemetry: Telemetry;
  historical_transactions: HistoricalTransaction[];
}

export interface DisputeRecord {
  dispute_id: string;
  network: string;
  reason_code: string;
  claim_type: string;
  decision: Decision;
  final_status: string;
  win_probability: number;
  iterations_used: number;
  created_at: string;
}

export interface DisputeDetail {
  dispute_id: string;
  result: DisputeResult;
  event_payload: EventPayload;
  created_at: string;
}

export interface HealthInfo {
  status: string;
  model: string;
  database: "up" | "down";
}

export const DISPUTE_FEE_USD = 15;
export const COST_TO_FIGHT_USD = 50;

export const FINAL_STATUS_LABELS: Record<string, string> = {
  DISPUTE_CONTESTED_DOSSIER_FINALIZED: "Dossier Finalized",
  AUTO_SETTLED_MERCHANT_NOTIFIED: "Auto-Settled",
  ESCALATED_REQUIRES_HUMAN_REVIEW: "Human Review",
  ESCALATED_MAX_AUDIT_ITERATIONS: "Escalated — Max Iterations",
};
