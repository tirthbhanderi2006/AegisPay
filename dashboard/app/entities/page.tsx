"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  Search,
  Filter,
  GitBranch,
  Zap,
  Globe,
  CreditCard,
  Users,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Hand,
  Target,
} from "lucide-react";
import { Card, Badge, Button, Input, Select, Tabs, Dropdown, Modal, Table, StatusBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";

const ENTITY_TYPES = [
  { value: "all", label: "All Types", icon: <GitBranch className="w-4 h-4" /> },
  { value: "device", label: "Device Tokens", icon: <Zap className="w-4 h-4" /> },
  { value: "ip", label: "IP Tokens", icon: <Globe className="w-4 h-4" /> },
  { value: "instrument", label: "Payment Instruments", icon: <CreditCard className="w-4 h-4" /> },
  { value: "cluster", label: "Behavioral Clusters", icon: <Users className="w-4 h-4" /> },
  { value: "account", label: "Account Tokens", icon: <Users className="w-4 h-4" /> },
];

const MOCK_ENTITIES = [
  { id: "dev_••••91A2", type: "device", risk: 0.78, connections: 5, accounts: 5, lastSeen: "2026-08-29T14:30:00Z", status: "active" },
  { id: "ip_••••7F12", type: "ip", risk: 0.65, connections: 8, accounts: 8, lastSeen: "2026-08-29T14:28:00Z", status: "active" },
  { id: "cluster_A", type: "cluster", risk: 0.82, connections: 12, accounts: 15, lastSeen: "2026-08-29T14:25:00Z", status: "active" },
  { id: "pi_••••4111", type: "instrument", risk: 0.45, connections: 3, accounts: 2, lastSeen: "2026-08-29T14:20:00Z", status: "active" },
  { id: "acct_••••9918", type: "account", risk: 0.38, connections: 2, accounts: 1, lastSeen: "2026-08-29T14:15:00Z", status: "active" },
  { id: "dev_••••3B7F", type: "device", risk: 0.91, connections: 8, accounts: 8, lastSeen: "2026-08-29T14:10:00Z", status: "active" },
  { id: "ip_••••2A4D", type: "ip", risk: 0.72, connections: 6, accounts: 6, lastSeen: "2026-08-29T14:05:00Z", status: "active" },
  { id: "cluster_B", type: "cluster", risk: 0.68, connections: 9, accounts: 11, lastSeen: "2026-08-29T14:00:00Z", status: "active" },
];

export default function EntitiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [graphView, setGraphView] = useState<"list" | "graph">("list");
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [showDetail, setShowDetail] = useState<any>(null);

  const filteredEntities = MOCK_ENTITIES.filter((entity) => {
    const matchesSearch = entity.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || entity.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <MainLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-ink">Entity Intelligence</h1>
            <p className="text-ink-muted mt-1">Cross-merchant entity graph with risk propagation and privacy boundaries</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh Graph</Button>
            <Badge variant="info" size="sm" className="ml-2">PRIVACY PROTECTED</Badge>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1">
            <Input
              placeholder="Search entity tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={typeFilter}
            options={ENTITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-48"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setGraphView("list")} className={graphView === "list" ? "bg-gold/10 text-gold border-gold" : ""}>
              List
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGraphView("graph")} className={graphView === "graph" ? "bg-gold/10 text-gold border-gold" : ""}>
              Graph
            </Button>
          </div>
        </motion.div>

        {/* View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {graphView === "list" ? (
            <EntityListView entities={filteredEntities} onSelect={setSelectedEntity} />
          ) : (
            <EntityGraphView entities={filteredEntities} onSelect={setShowDetail} viewport={viewport} onViewportChange={setViewport} />
          )}
        </motion.div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && (
          <EntityDetailModal entity={showDetail} onClose={() => setShowDetail(null)} />
        )}
      </AnimatePresence>
    </MainLayout>
  );
}

function EntityListView({ entities, onSelect }: { entities: any[]; onSelect: (id: string) => void }) {
  return (
    <Card variant="raised" padding="none">
      <Table
        columns={[
          { key: "id", header: "Entity Token", width: "180px", render: (row: any) => <span className="font-mono text-sm font-medium">{row.id}</span> },
          { key: "type", header: "Type", width: "140px", render: (row: any) => <Badge variant="info" size="sm">{row.type.toUpperCase()}</Badge> },
          { key: "risk", header: "Risk Score", align: "center", width: "110px", render: (row: any) => <span className="font-mono text-ink">{row.risk}</span> },
          { key: "connections", header: "Connections", align: "center", width: "110px", render: (row: any) => <span className="text-ink-muted">{row.connections}</span> },
          { key: "accounts", header: "Linked Accounts", align: "center", width: "130px", render: (row: any) => <span className="text-ink-muted">{row.accounts}</span> },
          { key: "lastSeen", header: "Last Seen", align: "right", width: "180px", render: (row: any) => <span className="font-mono text-ink-muted">{new Date(row.lastSeen).toLocaleString()}</span> },
          { key: "status", header: "Status", align: "center", width: "100px", render: (row: any) => <StatusBadge status={row.status as any} size="sm" /> },
        ]}
        data={entities}
        keyExtractor={(row: any) => row.id}
        onRowClick={(row: any) => onSelect(row.id)}
        rowClassName={(row: any) => clsx("cursor-pointer hover:bg-surface-overlay/50", row.risk > 0.7 && "bg-red/5", row.risk > 0.4 && "bg-amber/5")}
      />
    </Card>
  );
}

function EntityGraphView({ entities, onSelect, viewport, onViewportChange }: { entities: any[]; onSelect: (entity: any) => void; viewport: any; onViewportChange: (v: any) => void }) {
  return (
    <Card variant="raised" padding="none" className="relative h-[600px] overflow-hidden">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-surface-raised/90 backdrop-blur p-2 rounded-lg border border-line">
        <Button variant="ghost" size="icon" onClick={() => onViewportChange({ ...viewport, zoom: Math.min(viewport.zoom * 1.2, 3) })} aria-label="Zoom in"><ZoomIn className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => onViewportChange({ ...viewport, zoom: Math.max(viewport.zoom / 1.2, 0.3) })} aria-label="Zoom out"><ZoomOut className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => onViewportChange({ x: 0, y: 0, zoom: 1 })} aria-label="Reset view"><Target className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => onViewportChange({ ...viewport, x: 0, y: 0 })} aria-label="Pan"><Hand className="w-4 h-4" /></Button>
        <span className="text-sm text-ink-muted px-2">{Math.round(viewport.zoom * 100)}%</span>
      </div>

      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={(e) => {
          e.preventDefault();
          onViewportChange({ ...viewport, zoom: Math.max(0.3, Math.min(3, viewport.zoom - e.deltaY * 0.001)) });
        }}
        onMouseDown={(e) => {
          const startX = e.clientX - viewport.x;
          const startY = e.clientY - viewport.y;
          const onMouseMove = (e: MouseEvent) => {
            onViewportChange({ ...viewport, x: e.clientX - startX, y: e.clientY - startY });
          };
          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}
      >
        <svg viewBox="0 0 800 600" className="w-full h-full" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "0 0" }}>
          <defs>
            <marker id="arrowhead-entity" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
            </marker>
            {entities.map((n) => (
              <radialGradient key={n.id} id={`grad-entity-${n.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={n.risk > 0.7 ? "#EF4444" : n.risk > 0.4 ? "#F59E0B" : "#10B981"} stopOpacity="0.3" />
                <stop offset="100%" stopColor={n.risk > 0.7 ? "#EF4444" : n.risk > 0.4 ? "#F59E0B" : "#10B981"} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          {/* Connections between entities */}
          <g stroke="#334155" strokeWidth="1" strokeDasharray="4,4" opacity="0.5">
            {entities.flatMap((entity) =>
              entities
                .filter((e) => e.id !== entity.id)
                .slice(0, 2)
                .map((target) => {
                  const from = getEntityPosition(entity.id);
                  const to = getEntityPosition(target.id);
                  return (
                    <line key={`${entity.id}-${target.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                  );
                })
            )}
          </g>

          {/* Entities */}
          <g>
            {entities.map((entity) => {
              const pos = getEntityPosition(entity.id);
              return (
                <g key={entity.id} onClick={() => onSelect(entity)} className="cursor-pointer">
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={entity.type === "cluster" ? 35 : 25}
                    fill={`url(#grad-entity-${entity.id})`}
                    stroke={entity.risk > 0.7 ? "#EF4444" : entity.risk > 0.4 ? "#F59E0B" : "#10B981"}
                    strokeWidth={entity.risk > 0.7 ? 3 : 2}
                    filter="drop-shadow(0 4px 12px rgba(0,0,0,0.3))"
                  />
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight="bold" fill="var(--fg-primary)">
                    {entity.id.length > 12 ? entity.id.slice(0, 10) + "…" : entity.id}
                  </text>
                  <text x={pos.x} y={pos.y + 16} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="var(--fg-muted)">
                    Risk: {(entity.risk * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </Card>
  );
}

function getEntityPosition(id: string) {
  const positions: Record<string, { x: number; y: number }> = {
    "dev_••••91A2": { x: 200, y: 200 },
    "ip_••••7F12": { x: 600, y: 200 },
    "cluster_A": { x: 100, y: 400 },
    "pi_••••4111": { x: 400, y: 400 },
    "acct_••••9918": { x: 700, y: 400 },
    "dev_••••3B7F": { x: 500, y: 100 },
    "ip_••••2A4D": { x: 300, y: 300 },
    "cluster_B": { x: 600, y: 450 },
  };
  return positions[id] || { x: Math.random() * 800, y: Math.random() * 600 };
}

function EntityDetailModal({ entity, onClose }: { entity: any; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Entity: ${entity.id}`} size="lg" description={`Type: ${entity.type} • Risk: ${(entity.risk * 100).toFixed(0)}%`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">ENTITY TOKEN</p>
            <p className="font-mono text-lg text-ink">{entity.id}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">TYPE</p>
            <p className="font-medium text-ink mt-1 capitalize">{entity.type}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Risk Score" value={entity.risk} suffix="/1.00" icon={<Zap className="w-5 h-5" />} color={entity.risk > 0.7 ? "red" : entity.risk > 0.4 ? "amber" : "emerald"} />
          <MetricCard label="Connections" value={entity.connections} icon={<GitBranch className="w-5 h-5" />} color="purple" />
          <MetricCard label="Linked Accounts" value={entity.accounts} icon={<Users className="w-5 h-5" />} color="azure" />
        </div>

        <Card variant="outlined" padding="lg">
          <h3 className="text-lg font-semibold text-ink mb-4">CONNECTED ENTITIES</h3>
          <p className="text-sm text-ink-muted mb-4">Direct relationships within the cross-merchant graph (privacy-safe view)</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: entity.connections }, (_, i) => (
              <Badge key={i} variant="info" size="sm">{entity.type === "device" ? "ip" : "device"}_••••{Math.random().toString(36).slice(2, 6).toUpperCase()}</Badge>
            ))}
          </div>
        </Card>

        <Card variant="outlined" padding="lg">
          <h3 className="text-lg font-semibold text-ink mb-4">RISK PROPAGATION</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Direct (1.0x)</span>
              <span className="font-mono text-ink">{(entity.risk * 1.0).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">1-Hop (0.5x)</span>
              <span className="font-mono text-ink">{(entity.risk * 0.5).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">2-Hop (0.25x)</span>
              <span className="font-mono text-ink">{(entity.risk * 0.25).toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <div className="pt-4 border-t border-line text-sm text-ink-muted">
          <p><strong>PRIVACY NOTICE:</strong> Counterparty merchant identities, raw IPs, and customer PII are strictly excluded per AegisPay privacy boundaries.</p>
        </div>
      </div>
    </Modal>
  );
}

function MetricCard({ label, value, suffix = "", icon, color }: { label: string; value: number; suffix?: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    red: "text-red",
    emerald: "text-emerald",
    gold: "text-gold",
    amber: "text-amber",
    purple: "text-purple",
    azure: "text-azure",
  };

  return (
    <div className="p-4 bg-surface-overlay/50 rounded-lg border border-line">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold font-mono text-ink mt-1">{value}<span className="text-lg font-normal text-ink-muted">{suffix}</span></p>
        </div>
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", `bg-${color}/15 ${colorMap[color] || "text-gold"}`)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

