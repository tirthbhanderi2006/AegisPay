"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  RefreshCw,
  Download,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card, Badge, Table, Button, Select, Input, Modal, StatusBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { JsonViewer } from "@/components/data-display/JsonViewer";
import type { PaymentEventEnvelope } from "@/lib/types";

const EVENT_TYPES = [
  { value: "all", label: "All Lifecycle Events" },
  { value: "transaction.created", label: "transaction.created" },
  { value: "transaction.authorized", label: "transaction.authorized" },
  { value: "transaction.failed", label: "transaction.failed" },
  { value: "transaction.completed", label: "transaction.completed" },
  { value: "transaction.refunded", label: "transaction.refunded" },
  { value: "transaction.disputed", label: "transaction.disputed" },
];

const MOCK_EVENTS: PaymentEventEnvelope[] = [
  {
    event_id: "evt_001928",
    transaction_id: "txn_001",
    merchant_id: "m_sandbox",
    event_type: "transaction.created",
    timestamp: "2026-08-29T14:31:02.000Z",
    amount: 830.0,
    currency: "USD",
    idempotency_key: "idem_txn_001_create",
    status: "processed",
  },
  {
    event_id: "evt_001929",
    transaction_id: "txn_001",
    merchant_id: "m_sandbox",
    event_type: "transaction.failed",
    timestamp: "2026-08-29T14:31:03.000Z",
    amount: 830.0,
    currency: "USD",
    idempotency_key: "idem_txn_001_fail",
    status: "processed",
  },
  {
    event_id: "evt_001930",
    transaction_id: "txn_vel_9021",
    merchant_id: "m_sandbox",
    event_type: "transaction.created",
    timestamp: "2026-08-29T14:30:10.000Z",
    amount: 249.99,
    currency: "USD",
    idempotency_key: "idem_txn_vel_9021",
    status: "already_processed_idempotent",
  },
  {
    event_id: "evt_001931",
    transaction_id: "txn_demo_norm",
    merchant_id: "m_sandbox",
    event_type: "transaction.authorized",
    timestamp: "2026-08-29T14:28:44.000Z",
    amount: 42.5,
    currency: "USD",
    idempotency_key: "idem_txn_demo_norm_auth",
    status: "processed",
  },
  {
    event_id: "evt_001932",
    transaction_id: "txn_demo_norm",
    merchant_id: "m_sandbox",
    event_type: "transaction.completed",
    timestamp: "2026-08-29T14:28:45.000Z",
    amount: 42.5,
    currency: "USD",
    idempotency_key: "idem_txn_demo_norm_comp",
    status: "processed",
  },
  {
    event_id: "evt_001933",
    transaction_id: "txn_hold_audit",
    merchant_id: "m_sandbox",
    event_type: "transaction.disputed",
    timestamp: "2026-08-29T14:22:15.000Z",
    amount: 4500.0,
    currency: "USD",
    idempotency_key: "idem_txn_hold_audit_disp",
    status: "processed",
  },
];

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<PaymentEventEnvelope | null>(null);

  const filteredEvents = useMemo(() => {
    return MOCK_EVENTS.filter((event) => {
      const matchesSearch =
        event.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.transaction_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || event.event_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  const getEventBadge = (type: string) => {
    switch (type) {
      case "transaction.completed":
      case "transaction.authorized":
        return <Badge variant="success" size="sm">{type}</Badge>;
      case "transaction.failed":
      case "transaction.disputed":
        return <Badge variant="danger" size="sm">{type}</Badge>;
      case "transaction.refunded":
        return <Badge variant="warning" size="sm">{type}</Badge>;
      default:
        return <Badge variant="info" size="sm">{type}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Payment Lifecycle Events</h1>
            <p className="text-xs text-ink-muted mt-1">
              Real-time payment event ingestion stream (POST /v1/events) with idempotency tracking and chronological sorting
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => alert("Exporting event stream as JSON...")}
            >
              Export JSON
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search event_id or txn_id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-ink-muted" />}
          />

          <Select
            value={typeFilter}
            options={EVENT_TYPES}
            onChange={(e) => setTypeFilter(e.target.value)}
          />

          <div className="flex items-center justify-end text-xs font-mono text-ink-muted">
            <span>{filteredEvents.length} events logged</span>
          </div>
        </div>

        {/* High-density Events Table */}
        <Card variant="raised" padding="none">
          <Table
            columns={[
              {
                key: "event_id",
                header: "Event ID",
                render: (row: PaymentEventEnvelope) => (
                  <span className="font-mono text-xs text-gold font-bold">{row.event_id}</span>
                ),
              },
              {
                key: "transaction_id",
                header: "Transaction Reference",
                render: (row: PaymentEventEnvelope) => (
                  <span className="font-mono text-xs text-ink font-semibold">{row.transaction_id}</span>
                ),
              },
              {
                key: "event_type",
                header: "Event Type",
                render: (row: PaymentEventEnvelope) => getEventBadge(row.event_type),
              },
              {
                key: "amount",
                header: "Amount",
                render: (row: PaymentEventEnvelope) => (
                  <span className="font-mono text-xs text-ink">
                    {row.currency} {row.amount?.toFixed(2)}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Ingestion Status",
                align: "center",
                render: (row: PaymentEventEnvelope) => (
                  <Badge
                    variant={row.status === "processed" ? "success" : "warning"}
                    size="sm"
                    dot
                  >
                    {row.status === "processed" ? "PROCESSED" : "IDEMPOTENT CACHED"}
                  </Badge>
                ),
              },
              {
                key: "timestamp",
                header: "Timestamp",
                align: "right",
                render: (row: PaymentEventEnvelope) => (
                  <span className="font-mono text-xs text-ink-faint">
                    {new Date(row.timestamp).toLocaleTimeString()}
                  </span>
                ),
              },
            ]}
            data={filteredEvents}
            keyExtractor={(row) => row.event_id}
            onRowClick={(row) => setSelectedEvent(row)}
            rowClassName={() => "cursor-pointer hover:bg-surface-overlay/60 transition-colors"}
          />
        </Card>

        {/* Selected Event Details Modal */}
        {selectedEvent && (
          <Modal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            title={`Lifecycle Event: ${selectedEvent.event_id}`}
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-surface-overlay rounded border border-line">
                  <span className="text-ink-faint block uppercase text-[10px]">Event Type</span>
                  <span className="text-ink font-bold">{selectedEvent.event_type}</span>
                </div>
                <div className="p-3 bg-surface-overlay rounded border border-line">
                  <span className="text-ink-faint block uppercase text-[10px]">Idempotency Key</span>
                  <span className="text-gold font-bold select-all">{selectedEvent.idempotency_key}</span>
                </div>
              </div>

              <JsonViewer
                data={selectedEvent}
                title="Event Envelope JSON (POST /v1/events)"
                maxHeight="220px"
              />
            </div>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
}