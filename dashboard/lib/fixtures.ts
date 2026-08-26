import type { DisputeDetail, DisputeResult, EventPayload } from "./types";

export interface ScenarioDef {
  id: string;
  fixture: string;
  label: string;
  sublabel: string;
  payload: EventPayload;
  mockResult: DisputeResult;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

const strongEvent: EventPayload = {
  dispute_id: "dsp_visa_ce3_strong_001",
  network: "VISA",
  reason_code: "10.4",
  reason_code_description: "Fraud, Card-Absent Environment",
  amount: 495.0,
  currency: "USD",
  disputed_transaction_id: "txn_20260601_8842",
  telemetry: {
    transaction_id: "txn_20260601_8842",
    timestamp: "2026-06-01T14:32:00Z",
    amount: 495.0,
    currency: "USD",
    ip_address: "203.0.113.42",
    device_hash: "dev_9f3ab77c41e2d804",
    card_last4: "4242",
    customer_email: "j***@example.com",
    customer_name: "J***",
    order_id: "ord_55219",
    fulfillment_type: "physical",
    three_ds_eci: "05",
    three_ds_status: "completed",
    avs_result: "Y",
    cvv_check: "M",
    lifetime_orders: 7,
    shipping_carrier: "BlueDart",
    tracking_number: "BD7719300421",
    delivered_at: "2026-06-05T11:20:00Z",
    signature_name: "Jordan Mehta",
  },
  historical_transactions: [
    {
      transaction_id: "txn_20250910_1103",
      timestamp: "2025-09-10T09:15:00Z",
      amount: 320.0,
      currency: "USD",
      ip_address: "203.0.113.42",
      device_hash: "dev_9f3ab77c41e2d804",
      card_last4: "4242",
      order_id: "ord_40871",
    },
    {
      transaction_id: "txn_20251120_2277",
      timestamp: "2025-11-20T18:40:00Z",
      amount: 275.5,
      currency: "USD",
      ip_address: "203.0.113.42",
      device_hash: "dev_9f3ab77c41e2d804",
      card_last4: "4242",
      order_id: "ord_44102",
    },
  ],
};

const weakEvent: EventPayload = {
  dispute_id: "dsp_visa_weak_002",
  network: "VISA",
  reason_code: "10.4",
  reason_code_description: "Fraud, Card-Absent Environment",
  amount: 79.99,
  currency: "USD",
  disputed_transaction_id: "txn_20260601_9917",
  telemetry: {
    transaction_id: "txn_20260601_9917",
    timestamp: "2026-06-01T08:12:00Z",
    amount: 79.99,
    currency: "USD",
    ip_address: "192.0.2.88",
    device_hash: "dev_44c2be01a7f3",
    card_last4: "1881",
    customer_email: "r***@example.com",
    customer_name: "R***",
    order_id: "ord_55340",
    fulfillment_type: "physical",
    three_ds_eci: "06",
    three_ds_status: "attempted",
    avs_result: "A",
    cvv_check: "M",
    lifetime_orders: 3,
    shipping_carrier: "FedEx",
    tracking_number: "FX9921183740",
    delivered_at: "2026-06-06T16:45:00Z",
    signature_name: null,
  },
  historical_transactions: [
    {
      transaction_id: "txn_20260310_4410",
      timestamp: "2026-03-10T13:05:00Z",
      amount: 54.2,
      currency: "USD",
      ip_address: "198.51.100.7",
      device_hash: "dev_aa1190cd32b7",
      card_last4: "1881",
      order_id: "ord_52017",
    },
    {
      transaction_id: "txn_20260415_5128",
      timestamp: "2026-04-15T21:33:00Z",
      amount: 61.75,
      currency: "USD",
      ip_address: "198.51.100.19",
      device_hash: "dev_c77e5510bb92",
      card_last4: "1881",
      order_id: "ord_53166",
    },
  ],
};

const unknownEvent: EventPayload = {
  dispute_id: "dsp_mc_unknown_003",
  network: "MASTERCARD",
  reason_code: "99.99",
  reason_code_description: "New scheme pilot code - resolution pending network documentation",
  amount: 120.0,
  currency: "USD",
  disputed_transaction_id: "txn_20260528_3120",
  telemetry: {
    transaction_id: "txn_20260528_3120",
    timestamp: "2026-05-28T10:47:00Z",
    amount: 120.0,
    currency: "USD",
    ip_address: "203.0.113.90",
    device_hash: "dev_71b0ce44a291",
    card_last4: "5309",
    customer_email: "s***@example.com",
    customer_name: "S***",
    order_id: "ord_55093",
    fulfillment_type: "digital",
    three_ds_eci: null,
    three_ds_status: null,
    avs_result: null,
    cvv_check: null,
    lifetime_orders: 1,
  },
  historical_transactions: [],
};

const npciEvent: EventPayload = {
  dispute_id: "dsp_npci_dup_004",
  network: "NPCI",
  reason_code: "FRM-DUP",
  reason_code_description: "Duplicate processing of the same transaction (RuPay/UPI dispute)",
  amount: 310.0,
  currency: "USD",
  disputed_transaction_id: "txn_20260530_7781",
  telemetry: {
    transaction_id: "txn_20260530_7781",
    timestamp: "2026-05-30T09:02:00Z",
    amount: 310.0,
    currency: "USD",
    ip_address: "198.51.100.240",
    device_hash: "dev_e3091cc7f5aa",
    card_last4: "6042",
    customer_email: "v***@example.com",
    customer_name: "V***",
    order_id: "ord_55184",
    fulfillment_type: "digital",
    three_ds_eci: null,
    three_ds_status: null,
    avs_result: null,
    cvv_check: null,
    lifetime_orders: 4,
  },
  historical_transactions: [
    {
      transaction_id: "txn_20260214_2091",
      timestamp: "2026-02-14T17:26:00Z",
      amount: 310.0,
      currency: "USD",
      ip_address: "198.51.100.201",
      device_hash: "dev_b8421da0ee31",
      card_last4: "6042",
      order_id: "ord_53902",
    },
    {
      transaction_id: "txn_20251218_1544",
      timestamp: "2025-12-18T12:11:00Z",
      amount: 189.99,
      currency: "USD",
      ip_address: "198.51.100.240",
      device_hash: "dev_e3091cc7f5aa",
      card_last4: "6042",
      order_id: "ord_48770",
    },
  ],
};

const strongMock: DisputeResult = {
  dispute_id: strongEvent.dispute_id,
  network: "VISA",
  reason_code: "10.4",
  claim_type: "FRAUD_UNRECOGNIZED",
  classification_source: "static_table",
  decision: "fight",
  final_status: "DISPUTE_CONTESTED_DOSSIER_FINALIZED",
  iterations_used: 2,
  max_iterations: 2,
  win_probability: 0.95,
  expected_value_fight: 394.75,
  expected_value_settle: -495.0,
  primary_gap: "None — CE3.0 qualifying evidence chain satisfied.",
  rule_engine: {
    ce3_applicable: true,
    ce3_qualified: true,
    qualifying_tx_count: 2,
    qualifying_transactions: [
      { transaction_id: "txn_20250910_1103", days_before_dispute: 264, matched_identifier: "ip_address" },
      { transaction_id: "txn_20251120_2277", days_before_dispute: 193, matched_identifier: "ip_address" },
    ],
    rejection_reasons: [],
    evidence_flags: {
      three_ds_completed: true,
      three_ds_attempted_only: false,
      named_recipient_signature: true,
      physical_delivery_proof: true,
      identifier_match_with_history: true,
    },
  },
  dossier: {
    executive_summary:
      "The disputed transaction of USD 495.00 was authorized through completed 3‑DS authentication (ECI 05) and utilized the same IP address and device hash as two prior legitimate purchases. Delivery records confirm receipt of the goods on 2026-06-05 with carrier BlueDart and a captured signature. These data points satisfy Visa CE3.0 criteria, supporting a finding that the transaction is not fraudulent.",
    dispute_classification: "Visa CE3.0 Qualified — Card-Absent Fraud Claim",
    compelling_evidence_type:
      "Visa CE3.0 – Cardholder Authentication, Device/IP Consistency, Delivery Confirmation",
    evidence_points: [
      {
        category: "Cardholder Authentication",
        claim: "3‑DS authentication completed with ECI 05 for the disputed transaction.",
        source_metric: "three_ds_status: completed; three_ds_eci: 05",
        rule_mapping: "Visa CE3.0 – Cardholder Authentication (3DS)",
      },
      {
        category: "Device/IP Consistency",
        claim: "Identical IP address 203.0.113.42 used in the disputed transaction and both qualifying historical transactions.",
        source_metric: "ip_address: 203.0.113.42 (disputed and historical)",
        rule_mapping: "Visa CE3.0 – Consistent Device and IP",
      },
      {
        category: "Device Fingerprint Consistency",
        claim: "Identical device_hash dev_9f3ab77c41e2d804 present in the disputed transaction and both historical transactions.",
        source_metric: "device_hash: dev_9f3ab77c41e2d804",
        rule_mapping: "Visa CE3.0 – Device Fingerprint Consistency",
      },
      {
        category: "Cardholder Consistency",
        claim: "Card last four digits 4242 match across the disputed and historical transactions.",
        source_metric: "card_last4: 4242",
        rule_mapping: "Visa CE3.0 – Cardholder Consistency",
      },
      {
        category: "Delivery Confirmation",
        claim: "Order delivered on 2026-06-05 at 11:20 UTC via BlueDart, tracking number BD7719300421, signed by Jordan Mehta.",
        source_metric: "delivered_at: 2026-06-05T11:20:00Z; shipping_carrier: BlueDart; signature_name: Jordan Mehta",
        rule_mapping: "Visa CE3.0 – Delivery Confirmation",
      },
      {
        category: "Historical Transaction Consistency",
        claim: "Two prior transactions occurred 264 and 193 days before the disputed transaction, each sharing the same IP address.",
        source_metric: "days_before_dispute: 264 and 193; matched_identifier: ip_address",
        rule_mapping: "Visa CE3.0 – Transaction History Consistency",
      },
    ],
    rebuttal_narrative:
      "The merchant submits this dossier in response to Visa Reason Code 10.4, asserting that the contested charge is not the result of unauthorized activity. The disputed purchase was processed at 2026-06-01 14:32 UTC for USD 495.00 and was authorized through a completed three-domain secure flow, indicated by an ECI value of 05. This authentication outcome satisfies Visa CE3.0 requirements for cardholder verification. The transaction originated from IP address 203.0.113.42 and device hash dev_9f3ab77c41e2d804, identifiers identical to those recorded in two earlier legitimate purchases made 264 days and 193 days prior. The recurrence of these network and device attributes demonstrates a consistent usage pattern by the cardholder, meeting the CE3.0 criteria for device and IP consistency. The card's last four digits, 4242, are unchanged across all three transactions, further corroborating cardholder continuity. Fulfillment records show that the physical goods were shipped via BlueDart under tracking number BD7719300421 and delivered on 2026-06-05 at 11:20 UTC, signed for by Jordan Mehta, providing evidence of receipt by the intended recipient. Accordingly, the merchant requests that the chargeback be reversed and the disputed amount be reinstated.",
  },
  audit_trail: [
    {
      passed: false,
      confidence_score: 0.85,
      deficiencies: [
        "The rebuttal narrative states that the second historical transaction (2025-11-20 to 2026-06-01) is 192 days prior; the actual calendar interval is 193 days. This arithmetic error makes the claim unsupported by the telemetry.",
      ],
      suggested_revisions: [
        'Correct the day count for txn_20251120_2277 from "192 days" to "193 days" throughout the dossier.',
      ],
      iteration: 1,
      auditor_llm_failed: false,
    },
    {
      passed: true,
      confidence_score: 0.97,
      deficiencies: [],
      suggested_revisions: [],
      iteration: 2,
      auditor_llm_failed: false,
    },
  ],
  notice: null,
};

const weakMock: DisputeResult = {
  dispute_id: weakEvent.dispute_id,
  network: "VISA",
  reason_code: "10.4",
  claim_type: "FRAUD_UNRECOGNIZED",
  classification_source: "static_table",
  decision: "settle",
  final_status: "AUTO_SETTLED_MERCHANT_NOTIFIED",
  iterations_used: 0,
  max_iterations: 2,
  win_probability: 0.32,
  expected_value_fight: -89.0,
  expected_value_settle: -79.99,
  primary_gap:
    "txn_20260310_4410 excluded: 83 days before disputed transaction, outside the required 120-365 day window.; txn_20260415_5128 excluded: 47 days before disputed transaction, outside the required 120-365 day window.",
  rule_engine: {
    ce3_applicable: true,
    ce3_qualified: false,
    qualifying_tx_count: 0,
    qualifying_transactions: [],
    rejection_reasons: [
      "txn_20260310_4410 excluded: 83 days before disputed transaction, outside the required 120-365 day window.",
      "txn_20260415_5128 excluded: 47 days before disputed transaction, outside the required 120-365 day window.",
    ],
    evidence_flags: {
      three_ds_completed: false,
      three_ds_attempted_only: true,
      named_recipient_signature: false,
      physical_delivery_proof: false,
      identifier_match_with_history: false,
    },
  },
  dossier: null,
  audit_trail: [],
  notice: {
    notice_title: "Dispute Auto-Settlement Decision",
    notice_body:
      "Based on the data, the dispute was auto-settled because the expected financial outcome was negative. With a 32% win probability, a $15 dispute fee, and $79.99 at risk, contesting yielded an expected value of −$89.00 versus −$79.99 for acceptance. Settlement is the economically rational option.",
    improvement_tip:
      "Retain and reference supporting transaction records that are at least 120 days before the disputed date to meet the eligibility window.",
    notice_llm_failed: false,
  },
};

const unknownMock: DisputeResult = {
  dispute_id: unknownEvent.dispute_id,
  network: "MASTERCARD",
  reason_code: "99.99",
  claim_type: "UNKNOWN_REQUIRES_HUMAN_REVIEW",
  classification_source: "llm_fallback",
  decision: "escalate",
  final_status: "ESCALATED_REQUIRES_HUMAN_REVIEW",
  iterations_used: 0,
  max_iterations: 2,
  win_probability: 0.25,
  expected_value_fight: -121.25,
  expected_value_settle: -120.0,
  primary_gap:
    "Reason code 99.99 is not present in the static scheme table; fallback classifier returned UNKNOWN_REQUIRES_HUMAN_REVIEW.",
  rule_engine: {
    ce3_applicable: false,
    ce3_qualified: false,
    qualifying_tx_count: 0,
    qualifying_transactions: [],
    rejection_reasons: [
      "No historical transactions provided; CE3.0 requires at least two qualifying prior undisputed transactions.",
      "CE3.0 qualification is not applicable to claim type UNKNOWN_REQUIRES_HUMAN_REVIEW; evaluated for reference only.",
    ],
    evidence_flags: {
      three_ds_completed: false,
      three_ds_attempted_only: false,
      named_recipient_signature: false,
      physical_delivery_proof: false,
      identifier_match_with_history: false,
    },
  },
  dossier: null,
  audit_trail: [],
  notice: null,
};

const npciMock: DisputeResult = {
  dispute_id: npciEvent.dispute_id,
  network: "NPCI",
  reason_code: "FRM-DUP",
  claim_type: "DUPLICATE_CHARGE",
  classification_source: "static_table",
  decision: "fight",
  final_status: "DISPUTE_CONTESTED_DOSSIER_FINALIZED",
  iterations_used: 1,
  max_iterations: 2,
  win_probability: 0.6,
  expected_value_fight: 6.0,
  expected_value_settle: -310.0,
  primary_gap:
    "txn_20260214_2091 excluded: 105 days before disputed transaction, outside the required 120-365 day window.; Only 1 transaction satisfied all CE3.0 criteria after exclusions; the scheme requires at least 2.",
  rule_engine: {
    ce3_applicable: false,
    ce3_qualified: false,
    qualifying_tx_count: 1,
    qualifying_transactions: [
      { transaction_id: "txn_20251218_1544", days_before_dispute: 163, matched_identifier: "ip_address" },
    ],
    rejection_reasons: [
      "txn_20260214_2091 excluded: 105 days before disputed transaction, outside the required 120-365 day window.",
      "Only 1 transaction satisfied all CE3.0 criteria after exclusions; the scheme requires at least 2.",
    ],
    evidence_flags: {
      three_ds_completed: false,
      three_ds_attempted_only: false,
      named_recipient_signature: false,
      physical_delivery_proof: false,
      identifier_match_with_history: true,
    },
  },
  dossier: {
    executive_summary:
      "The disputed transaction dated 2026-05-30 does not constitute a duplicate charge under NPCI FRM-DUP criteria. Key transaction attributes — including order identifier, amount, and fulfillment type — differ from the only historical transaction that shares the same IP address and device hash.",
    dispute_classification: "NPCI FRM-DUP — Duplicate Charge Claim",
    compelling_evidence_type: "NPCI UDIR Duplicate Transaction Evidence",
    evidence_points: [
      {
        category: "Order Identifier Consistency",
        claim: "The disputed transaction uses order_id ord_55184, whereas the historical transaction with matching IP and device hash uses ord_48770.",
        source_metric: "order_id: ord_55184 (disputed) vs ord_48770 (historical)",
        rule_mapping: "NPCI UDIR Duplicate Transaction – Order ID Mismatch",
      },
      {
        category: "Amount Consistency",
        claim: "The disputed transaction amount is 310.00 USD, while the matching historical transaction amount is 189.99 USD.",
        source_metric: "amount: 310.0 (disputed) vs 189.99 (historical)",
        rule_mapping: "NPCI UDIR Duplicate Transaction – Amount Mismatch",
      },
      {
        category: "Fulfillment Type Differentiation",
        claim: "The disputed transaction is classified as digital fulfillment; no fulfillment_type is recorded for the historical transaction.",
        source_metric: "fulfillment_type: digital (disputed) vs null (historical)",
        rule_mapping: "NPCI UDIR Duplicate Transaction – Fulfillment Type Disparity",
      },
    ],
    rebuttal_narrative:
      "The merchant submits this dossier in response to Dispute ID dsp_npci_dup_004, classified under NPCI FRM-DUP for a purported duplicate charge of 310.00 USD. Under NPCI UDIR guidelines, a duplicate transaction must exhibit substantive matching identifiers, including order identifier, transaction amount, and fulfillment characteristics, within the applicable temporal window. Analysis of the telemetry reveals that the disputed transaction (txn_20260530_7781) shares the same IP address (198.51.100.240) and device hash (dev_e3091cc7f5aa) with a historical transaction (txn_20251218_1544) occurring 163 days prior. While these shared attributes satisfy a superficial similarity test, the critical identifiers diverge: the order IDs are distinct (ord_55184 vs ord_48770) and the amounts differ (310.00 vs 189.99 USD). A second historical transaction matches the disputed amount but falls 105 days before the dispute, outside the required window. The documented mismatches demonstrate that the two transactions represent separate consumer actions rather than an erroneous repeat charge. Consequently, the merchant requests that the chargeback be reversed and the disputed amount reinstated.",
  },
  audit_trail: [
    {
      passed: true,
      confidence_score: 0.93,
      deficiencies: [],
      suggested_revisions: [],
      iteration: 1,
      auditor_llm_failed: false,
    },
  ],
  notice: null,
};

export const SCENARIOS: ScenarioDef[] = [
  {
    id: "strong-ce3",
    fixture: "visa_ce3_qualified.json",
    label: "Strong Visa CE3.0",
    sublabel: "Auto-Fight & Win",
    payload: strongEvent,
    mockResult: strongMock,
  },
  {
    id: "weak-evidence",
    fixture: "visa_weak_no_match.json",
    label: "Weak Evidence",
    sublabel: "Auto-Settle & Save Fee",
    payload: weakEvent,
    mockResult: weakMock,
  },
  {
    id: "unknown-code",
    fixture: "mastercard_unknown_code.json",
    label: "Unknown Code",
    sublabel: "Safe Escalation",
    payload: unknownEvent,
    mockResult: unknownMock,
  },
  {
    id: "npci-udir",
    fixture: "npci_udir_duplicate.json",
    label: "NPCI UPI UDIR",
    sublabel: "Duplicate Claim Refutation",
    payload: npciEvent,
    mockResult: npciMock,
  },
];

export function scenarioSummaries(): DisputeDetail[] {
  return SCENARIOS.map((scenario, index) => ({
    dispute_id: scenario.payload.dispute_id,
    created_at: daysAgoIso(index + 1),
    event_payload: scenario.payload,
    result: scenario.mockResult,
  }));
}
