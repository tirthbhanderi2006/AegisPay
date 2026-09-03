"use client";

import React, { useState } from "react";
import {
  GitBranch,
  Shield,
  Smartphone,
  Globe,
  User,
  CreditCard,
  ZoomIn,
  ZoomOut,
  Target,
  RefreshCw,
  Lock,
} from "lucide-react";
import { Card, Badge, Button, Input, Select, Table, Modal } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { PrivacyToken } from "@/components/security/PrivacyToken";

interface EntityNode {
  id: string;
  type: "device" | "ip" | "instrument" | "account";
  maskedId: string;
  riskScore: number;
  connections: number;
  linkedMerchantsCount: number;
  lastSeen: string;
}

const MOCK_ENTITIES: EntityNode[] = [
  {
    id: "dev_91A2",
    maskedId: "dev_••••91A2",
    type: "device",
    riskScore: 0.78,
    connections: 5,
    linkedMerchantsCount: 4,
    lastSeen: "2026-08-29T14:30:00Z",
  },
  {
    id: "ip_7F12",
    maskedId: "ip_••••7F12",
    type: "ip",
    riskScore: 0.65,
    connections: 8,
    linkedMerchantsCount: 6,
    lastSeen: "2026-08-29T14:28:00Z",
  },
  {
    id: "pi_4111",
    maskedId: "pi_••••4111",
    type: "instrument",
    riskScore: 0.45,
    connections: 3,
    linkedMerchantsCount: 2,
    lastSeen: "2026-08-29T14:20:00Z",
  },
  {
    id: "acct_9918",
    maskedId: "acct_••••9918",
    type: "account",
    riskScore: 0.38,
    connections: 2,
    linkedMerchantsCount: 1,
    lastSeen: "2026-08-29T14:15:00Z",
  },
  {
    id: "dev_3B7F",
    maskedId: "dev_••••3B7F",
    type: "device",
    riskScore: 0.91,
    connections: 8,
    linkedMerchantsCount: 5,
    lastSeen: "2026-08-29T14:10:00Z",
  },
];

export default function EntitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState<EntityNode | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "canvas">("list");

  const filtered = MOCK_ENTITIES.filter((e) => {
    const matchSearch = e.maskedId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || e.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <MainLayout>
      <div className="space-y-6 select-text">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
              <span>ENTITY GRAPH</span>
              <span>/</span>
              <span className="font-bold text-ink">PRIVACY BOUNDARY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              Cross-Merchant Entity Intelligence
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm" dot>
              ZERO RAW PII EXPOSURE
            </Badge>
            <div className="flex items-center bg-surface-subtle p-0.5 rounded border border-line">
              <button
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-surface text-ink font-semibold border border-line shadow-subtle"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode("canvas")}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === "canvas"
                    ? "bg-surface text-ink font-semibold border border-line shadow-subtle"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Graph Canvas
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Guarantee Alert */}
        <div className="p-3 bg-surface-subtle rounded border border-line text-xs font-sans text-ink-secondary flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-ink font-mono text-[11px] uppercase block">
              Cryptographic Token Privacy Guarantee
            </span>
            <span>
              All device fingerprints, IP addresses, payment instruments, and account IDs are strictly hashed and masked. Counterparty merchant identities are never leaked across tenant boundaries.
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search masked tokens (dev_••••91A2)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            options={[
              { value: "all", label: "All Entity Types" },
              { value: "device", label: "Device Tokens" },
              { value: "ip", label: "IP Tokens" },
              { value: "instrument", label: "Payment Instruments" },
              { value: "account", label: "Account Tokens" },
            ]}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />

          <div className="flex items-center justify-end font-mono text-xs text-ink-muted">
            <span>{filtered.length} entities indexed</span>
          </div>
        </div>

        {/* Table View */}
        {viewMode === "list" ? (
          <Card variant="flat" padding="none" className="border">
            <Table
              columns={[
                {
                  key: "maskedId",
                  header: "Masked Entity Token",
                  render: (row: EntityNode) => (
                    <PrivacyToken token={row.maskedId} type={row.type === "instrument" ? "card" : row.type} />
                  ),
                },
                {
                  key: "type",
                  header: "Entity Type",
                  render: (row: EntityNode) => (
                    <Badge variant="neutral" size="sm">
                      {row.type.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: "riskScore",
                  header: "Entity Risk Index",
                  align: "center",
                  render: (row: EntityNode) => (
                    <span
                      className={`font-mono text-xs font-bold ${
                        row.riskScore >= 0.7
                          ? "text-red"
                          : row.riskScore >= 0.4
                          ? "text-amber"
                          : "text-emerald"
                      }`}
                    >
                      {(row.riskScore * 100).toFixed(0)}%
                    </span>
                  ),
                },
                {
                  key: "connections",
                  header: "Graph Degree",
                  align: "center",
                  render: (row: EntityNode) => (
                    <span className="font-mono text-xs text-ink">
                      {row.connections} connected nodes
                    </span>
                  ),
                },
                {
                  key: "linkedMerchantsCount",
                  header: "Cross-Merchant Spread",
                  align: "center",
                  render: (row: EntityNode) => (
                    <span className="font-mono text-xs text-ink-secondary">
                      {row.linkedMerchantsCount} merchant networks
                    </span>
                  ),
                },
                {
                  key: "lastSeen",
                  header: "Last Observed",
                  align: "right",
                  render: (row: EntityNode) => (
                    <span className="font-mono text-xs text-ink-muted">
                      {new Date(row.lastSeen).toLocaleTimeString()}
                    </span>
                  ),
                },
              ]}
              data={filtered}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => setSelectedEntity(row)}
              rowClassName={() => "cursor-pointer hover:bg-surface-subtle transition-colors"}
            />
          </Card>
        ) : (
          /* Graph Canvas View */
          <Card variant="flat" padding="lg" className="border relative min-h-[420px] flex items-center justify-center bg-surface-subtle/40">
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3 h-3" />}>
                Reset Canvas
              </Button>
            </div>
            <div className="text-center space-y-3">
              <GitBranch className="w-10 h-10 text-accent mx-auto" />
              <h3 className="font-bold text-sm text-ink">Interactive Entity Topology Canvas</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                2-hop BFS entity network radius. Nodes represent masked privacy tokens connected by shared checkout sessions.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                {filtered.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEntity(e)}
                    className="p-3 bg-surface rounded border border-line hover:border-accent text-xs font-mono transition-colors"
                  >
                    <span className="font-bold block text-ink">{e.maskedId}</span>
                    <span className="text-[10px] text-ink-muted">Risk: {(e.riskScore * 100).toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Entity Details Modal */}
        {selectedEntity && (
          <Modal
            isOpen={!!selectedEntity}
            onClose={() => setSelectedEntity(null)}
            title={`Entity Inspection: ${selectedEntity.maskedId}`}
            size="md"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted block text-[10px] uppercase">Entity Type</span>
                  <span className="font-bold text-ink">{selectedEntity.type.toUpperCase()}</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded border border-line">
                  <span className="text-ink-muted block text-[10px] uppercase">Risk Score</span>
                  <span className="font-bold text-red">{(selectedEntity.riskScore * 100).toFixed(1)} / 100</span>
                </div>
              </div>

              <div className="p-3 bg-surface-subtle rounded border border-line space-y-2 text-xs font-mono">
                <span className="font-bold text-ink uppercase text-[11px] block">
                  Risk Propagation Weights
                </span>
                <div className="flex justify-between text-ink-secondary">
                  <span>Direct Node Factor (1.0x)</span>
                  <span className="font-bold text-ink">{(selectedEntity.riskScore * 1.0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>1-Hop Propagation (0.5x)</span>
                  <span className="font-bold text-ink">{(selectedEntity.riskScore * 0.5).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>2-Hop Propagation (0.25x)</span>
                  <span className="font-bold text-ink">{(selectedEntity.riskScore * 0.25).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </MainLayout>
  );
}
