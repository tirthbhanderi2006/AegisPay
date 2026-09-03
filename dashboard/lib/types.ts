/**
 * AegisPay Unified Type Definitions
 * Covers Phase 1–5 Public V1 Contracts, Internal Domain Models, RBAC & UI States,
 * as well as legacy dispute types for backwards compatibility.
 */

export type DecisionAction = "ALLOW" | "CHALLENGE" | "BLOCK" | "MANUAL_HOLD";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type SignalSeverity = "low" | "medium" | "high" | "critical";

export interface RiskSignalResponse {
  name: string;
  severity: SignalSeverity;
  value: any;
  contribution: number;
  description: string;
}

export interface VersionInfo {
  calibration: string;
  policy: string;
  graph_snapshot: string;
  schema_version: string;
}

export interface AuditInfo {
  snapshot_id: string;
  decision_hash: string;
  recorded: boolean;
  degraded?: boolean;
}

export interface RiskEvaluationRequest {
  transaction_id: string;
  merchant_id: string;
  amount: number;
  currency?: string;
  account_token?: string | null;
  device_token?: string | null;
  ip_token?: string | null;
  payment_instrument_token?: string | null;
  timestamp?: string;
  order_id?: string | null;
  session_id?: string | null;
  billing_country?: string | null;
  shipping_country?: string | null;
  payment_method_type?: string | null;
  client_metadata?: Record<string, any>;
}

export interface RiskEvaluationResponse {
  transaction_id: string;
  decision_id: string;
  decision: DecisionAction;
  risk_score: number;
  risk_level: RiskLevel;
  evidence_quality: number;
  signals: RiskSignalResponse[];
  explanation: string[];
  versions: VersionInfo;
  audit: AuditInfo;
  calibration_version: string;
  request_id: string;
  latency_ms: number;
  degradation_notice?: string | null;
  created_at?: string;
}

export interface PaymentEventEnvelope {
  event_id: string;
  transaction_id: string;
  merchant_id: string;
  event_type:
    | "transaction.created"
    | "transaction.authorized"
    | "transaction.failed"
    | "transaction.completed"
    | "transaction.refunded"
    | "transaction.disputed";
  timestamp: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  idempotency_key?: string;
  status?: "processed" | "already_processed_idempotent" | "failed";
}

export interface WebhookDeliveryRecord {
  delivery_id: string;
  subscription_id: string;
  merchant_id: string;
  event_type: "risk.decision.created" | "risk.decision.updated" | "risk.manual_review.required";
  webhook_url: string;
  http_status: number;
  latency_ms: number;
  attempt_count: number;
  success: boolean;
  signature: string;
  timestamp: string;
  payload: Record<string, any>;
  replay_window_valid: boolean;
}

export interface DriftMonitoringMetrics {
  psi_score: number;
  ks_statistic: number;
  alert_level: "HEALTHY" | "WATCH" | "ALERT";
  calibration_drift: number;
  feature_drift_summary: Record<string, number>;
  sample_size: number;
  last_updated: string;
}

export interface HealthInfo {
  status: string;
  model: string;
  database: "up" | "down";
  components?: {
    behavioral_firewall: "operational" | "degraded" | "unavailable";
    entity_graph: "operational" | "degraded" | "unavailable";
    calibration: "operational" | "degraded" | "unavailable";
    fx_service: "operational" | "degraded" | "unavailable";
    audit_store: "operational" | "degraded" | "unavailable";
    webhook_dispatcher: "operational" | "degraded" | "unavailable";
  };
}

// ---------------------------------------------------------------------------
// RBAC & Security Models
// ---------------------------------------------------------------------------

export type UserRole = "OWNER" | "ADMIN" | "RISK_ANALYST" | "DEVELOPER" | "VIEWER";
export type Role = "risk_lead" | "merchant_operator" | "auditor" | "gateway" | "merchant" | "OWNER" | "ADMIN" | "RISK_ANALYST" | "DEVELOPER" | "VIEWER" | string;

export interface RBACPermission {
  action: string;
  description: string;
}

export interface RBACUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  merchant_id: string;
  status: "active" | "invited" | "suspended";
  last_active: string;
  avatar?: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  merchant_id: string;
  status: "active" | "revoked";
  environment: "sandbox" | "production";
  secret_plaintext?: string;
}

export interface SecurityEventRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  ip_address: string;
  status: "success" | "warning" | "denied";
  details?: string;
}

// ---------------------------------------------------------------------------
// Legacy Dispute Definitions (Preserved for backward compatibility)
// ---------------------------------------------------------------------------

export const COST_TO_FIGHT_USD = 15.0;
export const DISPUTE_FEE_USD = 15.0;

export const FINAL_STATUS_LABELS: Record<string, string> = {
  submitted: "Evidence Submitted",
  accepted: "Accepted / Won",
  lost: "Lost",
  under_review: "Under Review",
  pending: "Pending Evaluation",
  draft: "Draft",
};

export interface DisputeRecord {
  id: string;
  dispute_id: string;
  amount: number;
  currency: string;
  reason_code: string;
  network: string;
  status: string;
  final_status: string;
  recommendation: string;
  win_probability: number;
  created_at: string;
  [key: string]: any;
}

export interface EventPayload {
  dispute_id: string;
  amount: number;
  currency: string;
  reason_code: string;
  network?: string;
  created_at?: string;
  telemetry?: any;
  customer?: any;
  transaction?: any;
  evidence?: any;
  reason_code_description?: string;
  disputed_transaction_id?: string;
  [key: string]: any;
}

export interface DisputeResult {
  dispute_id: string;
  decision: string;
  win_probability: number;
  confidence?: number;
  reasoning?: string[];
  dossier?: any;
  rule_engine?: any;
  expected_value_fight: number;
  expected_value_settle: number;
  audit_trail: any[];
  iterations_used?: number;
  max_iterations?: number;
  final_status: string;
  notice?: any;
  primary_gap?: string;
  classification_source?: string;
  claim_type: string;
  reason_code?: string;
  network?: string;
  [key: string]: any;
}

export interface DisputeDetail {
  dispute_id: string;
  result: DisputeResult;
  event_payload: EventPayload;
  created_at: string;
  [key: string]: any;
}

export interface PaymentLifecycleEvent {
  event_id: string;
  transaction_id: string;
  merchant_id: string;
  event_type: string;
  timestamp: string;
  payload: Record<string, any>;
  processed: boolean;
  idempotent_replay: boolean;
  received_at?: string;
}

