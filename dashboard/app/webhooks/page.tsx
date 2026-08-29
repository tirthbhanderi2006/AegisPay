"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Shield,
  Clock,
  RefreshCw,
  Key,
  Globe,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
} from "lucide-react";
import { Card, Badge, Button, Table, Modal, Tabs, type TabItem, StatusBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { HmacInspector } from "@/components/security/HmacInspector";
import { JsonViewer } from "@/components/data-display/JsonViewer";
import { useRBAC, PermissionGuard } from "@/lib/rbac";
import type { WebhookDeliveryRecord } from "@/lib/types";

const MOCK_WEBHOOK_DELIVERIES: WebhookDeliveryRecord[] = [
  {
    delivery_id: "del_99a1b2c3d4",
    subscription_id: "sub_prod_01",
    merchant_id: "m_sandbox",
    event_type: "risk.decision.created",
    webhook_url: "https://merchant.example.com/api/v1/risk-webhook",
    http_status: 200,
    latency_ms: 45.2,
    attempt_count: 1,
    success: true,
    signature: "t=1787823879,v1=a4f891b2c3d4e5f67890123456789abcdefa4f891b2c3d4e5f67890123456789abc",
    timestamp: "2026-08-29T14:31:03Z",
    payload: {
      event_type: "risk.decision.created",
      transaction_id: "txn_001",
      decision: "BLOCK",
      risk_score: 0.914,
      risk_level: "HIGH",
      decision_id: "dec_txn_001_1787823879",
      timestamp: "2026-08-29T14:31:02Z",
    },
    replay_window_valid: true,
  },
  {
    delivery_id: "del_88e5f6g7h8",
    subscription_id: "sub_prod_01",
    merchant_id: "m_sandbox",
    event_type: "risk.decision.updated",
    webhook_url: "https://merchant.example.com/api/v1/risk-webhook",
    http_status: 200,
    latency_ms: 38.1,
    attempt_count: 1,
    success: true,
    signature: "t=1787823850,v1=5b129cd871239847129837192837129837198273918273918273918273918273",
    timestamp: "2026-08-29T14:30:45Z",
    payload: {
      event_type: "risk.decision.updated",
      transaction_id: "txn_vel_9021",
      decision: "CHALLENGE",
      risk_score: 0.584,
      risk_level: "MEDIUM",
      timestamp: "2026-08-29T14:30:12Z",
    },
    replay_window_valid: true,
  },
  {
    delivery_id: "del_77i9j0k1l2",
    subscription_id: "sub_audit_02",
    merchant_id: "m_sandbox",
    event_type: "risk.manual_review.required",
    webhook_url: "https://audit-gateway.example.com/events",
    http_status: 500,
    latency_ms: 5000.0,
    attempt_count: 3,
    success: false,
    signature: "t=1787823500,v1=8e8ec6c7d1bd02e7fe9d2b535b92ce993a4cfacbb228b8ec2cf018df8161ecbb",
    timestamp: "2026-08-29T14:25:12Z",
    payload: {
      event_type: "risk.manual_review.required",
      transaction_id: "txn_hold_audit",
      decision: "MANUAL_HOLD",
      risk_score: 0.689,
      timestamp: "2026-08-29T14:22:15Z",
    },
    replay_window_valid: true,
  },
];

export default function WebhooksPage() {
  const { currentRole } = useRBAC();
  const [activeTab, setActiveTab] = useState("deliveries");
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryRecord | null>(null);

  const tabs: TabItem[] = [
    { value: "deliveries", label: "Outbound Webhook Deliveries", icon: <Clock className="w-4 h-4" /> },
    { value: "security", label: "HMAC Security & Verification", icon: <Shield className="w-4 h-4" /> },
    { value: "subscriptions", label: "Registered Endpoints", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Webhook Operations & Security</h1>
            <p className="text-xs text-ink-muted mt-1">
              Cryptographically signed event delivery with HMAC-SHA256, 5-minute replay protection, and retry logs
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PermissionGuard permission="operations:webhooks_manage">
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                Register Webhook Endpoint
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Security Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="raised" padding="md" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                HMAC-SHA256 Signing
              </span>
              <Key className="w-4 h-4 text-emerald" />
            </div>
            <p className="text-xl font-bold font-mono text-ink">Strictly Enforced</p>
            <p className="text-xs text-ink-muted">Per-merchant shared secret with constant-time check</p>
          </Card>

          <Card variant="raised" padding="md" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Replay Window
              </span>
              <Clock className="w-4 h-4 text-emerald" />
            </div>
            <p className="text-xl font-bold font-mono text-ink">&lt; 300s (5 Minutes)</p>
            <p className="text-xs text-ink-muted">Timestamp drift validated against UTC clock</p>
          </Card>

          <Card variant="raised" padding="md" className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Receiver Idempotency
              </span>
              <Shield className="w-4 h-4 text-emerald" />
            </div>
            <p className="text-xl font-bold font-mono text-ink">X-Aegis-Delivery-Id</p>
            <p className="text-xs text-ink-muted">Guarantees exactly-once processing</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="pills">
          {/* Tab 1: Deliveries */}
          {activeTab === "deliveries" && (
            <div className="space-y-4 mt-4">
              <Card variant="raised" padding="none">
                <Table
                  columns={[
                    {
                      key: "delivery_id",
                      header: "Delivery ID",
                      render: (row: WebhookDeliveryRecord) => (
                        <span className="font-mono text-xs text-gold font-bold">{row.delivery_id}</span>
                      ),
                    },
                    {
                      key: "event_type",
                      header: "Event Type",
                      render: (row: WebhookDeliveryRecord) => (
                        <Badge variant="info" size="sm">
                          {row.event_type}
                        </Badge>
                      ),
                    },
                    {
                      key: "http_status",
                      header: "HTTP Status",
                      align: "center",
                      render: (row: WebhookDeliveryRecord) => (
                        <span
                          className={`font-mono text-xs font-bold ${
                            row.http_status >= 200 && row.http_status < 300 ? "text-emerald" : "text-red"
                          }`}
                        >
                          {row.http_status}
                        </span>
                      ),
                    },
                    {
                      key: "attempt_count",
                      header: "Attempts",
                      align: "center",
                      render: (row: WebhookDeliveryRecord) => (
                        <span className="font-mono text-xs text-ink-muted">#{row.attempt_count}</span>
                      ),
                    },
                    {
                      key: "latency_ms",
                      header: "Latency",
                      align: "right",
                      render: (row: WebhookDeliveryRecord) => (
                        <span className="font-mono text-xs text-ink-muted">{row.latency_ms.toFixed(1)}ms</span>
                      ),
                    },
                    {
                      key: "timestamp",
                      header: "Timestamp",
                      align: "right",
                      render: (row: WebhookDeliveryRecord) => (
                        <span className="font-mono text-xs text-ink-faint">
                          {new Date(row.timestamp).toLocaleTimeString()}
                        </span>
                      ),
                    },
                  ]}
                  data={MOCK_WEBHOOK_DELIVERIES}
                  keyExtractor={(row) => row.delivery_id}
                  onRowClick={(row) => setSelectedDelivery(row)}
                  rowClassName={() => "cursor-pointer hover:bg-surface-overlay/60 transition-colors"}
                />
              </Card>
            </div>
          )}

          {/* Tab 2: Security & HMAC Inspector */}
          {activeTab === "security" && (
            <div className="space-y-6 mt-4">
              <HmacInspector
                deliveryId="del_99a1b2c3d4"
                timestamp="2026-08-29T14:31:03Z"
                signature="t=1787823879,v1=a4f891b2c3d4e5f67890123456789abcdefa4f891b2c3d4e5f67890123456789abc"
                rawPayload={{
                  event_type: "risk.decision.created",
                  transaction_id: "txn_001",
                  decision: "BLOCK",
                  risk_score: 0.914,
                  decision_id: "dec_txn_001_1787823879",
                }}
                replayWindowValid={true}
              />

              <Card variant="raised" padding="lg" className="space-y-3 font-mono text-xs">
                <h3 className="font-bold text-ink uppercase tracking-wider">
                  Python Receiver Verification Blueprint
                </h3>
                <pre className="p-3 bg-surface rounded-lg border border-line text-ink-muted overflow-x-auto text-[11px]">
{`import hmac, hashlib, time

def verify_aegis_webhook(raw_body_bytes: bytes, signature_header: str, secret: str) -> bool:
    # 1. Parse header: t=...,v1=...
    parts = dict(x.split('=', 1) for x in signature_header.split(','))
    ts, received_sig = parts.get('t'), parts.get('v1')
    
    # 2. Check 5-minute replay window tolerance
    if not ts or abs(time.time() - float(ts)) > 300:
        return False
        
    # 3. Compute expected HMAC-SHA256 signature
    msg = f"{ts}.".encode('utf-8') + raw_body_bytes
    expected = hmac.new(secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
    
    # 4. Constant-time comparison
    return hmac.compare_digest(received_sig, expected)`}
                </pre>
              </Card>
            </div>
          )}

          {/* Tab 3: Registered Subscriptions */}
          {activeTab === "subscriptions" && (
            <div className="space-y-4 mt-4">
              <Card variant="raised" padding="none">
                <Table
                  columns={[
                    {
                      key: "endpoint",
                      header: "Destination URL",
                      render: (row) => (
                        <span className="font-mono text-xs text-ink font-semibold">{row.endpoint}</span>
                      ),
                    },
                    {
                      key: "events",
                      header: "Subscribed Events",
                      render: (row) => (
                        <div className="flex gap-1">
                          {row.events.map((e: string) => (
                            <Badge key={e} variant="neutral" size="sm">
                              {e}
                            </Badge>
                          ))}
                        </div>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: () => <Badge variant="success" size="sm" dot>ACTIVE</Badge>,
                    },
                    {
                      key: "secret",
                      header: "Webhook Secret",
                      align: "right",
                      render: () => (
                        <span className="font-mono text-xs text-ink-faint">whsec_••••••••••••••••3A9F</span>
                      ),
                    },
                  ]}
                  data={[
                    {
                      endpoint: "https://merchant.example.com/api/v1/risk-webhook",
                      events: ["risk.decision.created", "risk.decision.updated"],
                    },
                    {
                      endpoint: "https://audit-gateway.example.com/events",
                      events: ["risk.manual_review.required"],
                    },
                  ]}
                  keyExtractor={(row) => row.endpoint}
                />
              </Card>
            </div>
          )}
        </Tabs>

        {/* Selected Delivery Drawer Modal */}
        {selectedDelivery && (
          <Modal
            isOpen={!!selectedDelivery}
            onClose={() => setSelectedDelivery(null)}
            title={`Webhook Delivery: ${selectedDelivery.delivery_id}`}
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-surface-overlay rounded border border-line">
                  <span className="text-ink-faint block uppercase text-[10px]">HTTP Status</span>
                  <span className="text-emerald font-bold text-sm">{selectedDelivery.http_status} OK</span>
                </div>
                <div className="p-2.5 bg-surface-overlay rounded border border-line">
                  <span className="text-ink-faint block uppercase text-[10px]">Delivery Latency</span>
                  <span className="text-ink font-bold text-sm">{selectedDelivery.latency_ms} ms</span>
                </div>
              </div>

              <HmacInspector
                deliveryId={selectedDelivery.delivery_id}
                timestamp={selectedDelivery.timestamp}
                signature={selectedDelivery.signature}
                rawPayload={selectedDelivery.payload}
              />

              <JsonViewer data={selectedDelivery.payload} title="Delivered JSON Payload" maxHeight="200px" />
            </div>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
}