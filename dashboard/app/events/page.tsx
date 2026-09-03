"use client";

import React, { useState } from "react";
import {
  Activity,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { Card, Badge, Button, Input, Select, Table, Modal } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { JsonViewer } from "@/components/data-display/JsonViewer";
import type { PaymentLifecycleEvent } from "@/lib/types";

const MOCK_EVENTS: PaymentLifecycleEvent[] = [
  {
    event_id: "evt_001_created",
    transaction_id: "txn_001",
    merchant_id: "m_sandbox",
    event_type: "transaction.created",
    timestamp: "2026-08-29T14:31:00Z",
    payload: { amount: 830.0, currency: "USD", card_bin: "411111", country: "US" },
    processed: true,
    idempotent_replay: false,
    received_at: "2026-08-29T14:31:00.120Z",
  },
  {
    event_id: "evt_002_risk_evaluated",
    transaction_id: "txn_001",
    merchant_id: "m_sandbox",
    event_type: "risk.decision.created",
    timestamp: "2026-08-29T14:31:02Z",
    payload: { decision: "BLOCK", risk_score: 0.914, latency_ms: 4.7 },
    processed: true,
    idempotent_replay: false,
    received_at: "2026-08-29T14:31:02.045Z",
  },
  {
    event_id: "evt_003_failed",
    transaction_id: "txn_001",
    merchant_id: "m_sandbox",
    event_type: "transaction.failed",
    timestamp: "2026-08-29T14:31:03Z",
    payload: { reason: "risk_policy_blocked", action: "BLOCK" },
    processed: true,
    idempotent_replay: false,
    received_at: "2026-08-29T14:31:03.010Z",
  },
  {
    event_id: "evt_004_idem_dup",
    transaction_id: "txn_001",
    merchant_id: "m_sandbox",
    event_type: "transaction.created",
    timestamp: "2026-08-29T14:31:05Z",
    payload: { amount: 830.0, currency: "USD" },
    processed: true,
    idempotent_replay: true,
    received_at: "2026-08-29T14:31:05.002Z",
  },
];

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<PaymentLifecycleEvent | null>(null);

  const filtered = MOCK_EVENTS.filter((e) => {
    const matchSearch =
      e.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.transaction_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || e.event_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <MainLayout>
      <div className="space-y-6 select-text">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
              <span>INGESTION</span>
              <span>/</span>
              <span className="font-bold text-ink">LIFECYCLE STREAM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              Payment Lifecycle Ingestion Events
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => alert("Refreshing event stream...")}
            >
              Refresh Stream
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search event_id or txn_id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-ink-muted" />}
          />

          <Select
            options={[
              { value: "all", label: "All Lifecycle Types" },
              { value: "transaction.created", label: "transaction.created" },
              { value: "risk.decision.created", label: "risk.decision.created" },
              { value: "transaction.failed", label: "transaction.failed" },
              { value: "transaction.authorized", label: "transaction.authorized" },
              { value: "transaction.refunded", label: "transaction.refunded" },
            ]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />

          <div className="flex items-center justify-end font-mono text-xs text-ink-muted">
            <span>{filtered.length} lifecycle events</span>
          </div>
        </div>

        {/* Ledger */}
        <Card variant="flat" padding="none" className="border">
          <Table
            columns={[
              {
                key: "event_id",
                header: "Event ID",
                render: (row: PaymentLifecycleEvent) => (
                  <div>
                    <span className="font-mono text-xs font-bold text-ink block">{row.event_id}</span>
                    <span className="font-mono text-[10px] text-ink-faint">{row.transaction_id}</span>
                  </div>
                ),
              },
              {
                key: "event_type",
                header: "Lifecycle Type",
                render: (row: PaymentLifecycleEvent) => (
                  <Badge variant="info" size="sm">
                    {row.event_type}
                  </Badge>
                ),
              },
              {
                key: "idempotent_replay",
                header: "Idempotency State",
                align: "center",
                render: (row: PaymentLifecycleEvent) =>
                  row.idempotent_replay ? (
                    <Badge variant="warning" size="sm" dot>
                      IDEMPOTENT REPLAY
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm" dot>
                      ORIGINAL PROCESSED
                    </Badge>
                  ),
              },
              {
                key: "processed",
                header: "Processing",
                align: "center",
                render: (row: PaymentLifecycleEvent) => (
                  <span className="font-mono text-xs text-emerald font-semibold">100% PROCESSED</span>
                ),
              },
              {
                key: "timestamp",
                header: "Timestamp",
                align: "right",
                render: (row: PaymentLifecycleEvent) => (
                  <span className="font-mono text-xs text-ink-muted">
                    {new Date(row.timestamp).toLocaleTimeString()}
                  </span>
                ),
              },
            ]}
            data={filtered}
            keyExtractor={(row) => row.event_id}
            onRowClick={(row) => setSelectedEvent(row)}
            rowClassName={() => "cursor-pointer hover:bg-surface-subtle transition-colors"}
          />
        </Card>

        {/* Selected Event Modal */}
        {selectedEvent && (
          <Modal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            title={`Lifecycle Event: ${selectedEvent.event_id}`}
            size="md"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted block uppercase text-[10px]">Type</span>
                  <span className="text-ink font-bold">{selectedEvent.event_type}</span>
                </div>
                <div className="p-2.5 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted block uppercase text-[10px]">Idempotency</span>
                  <span className="text-ink font-bold">
                    {selectedEvent.idempotent_replay ? "REPLAYED DUPLICATE" : "CANONICAL FIRST PASS"}
                  </span>
                </div>
              </div>

              <JsonViewer data={selectedEvent.payload} title="Ingested Event Payload" maxHeight="250px" />
            </div>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
}