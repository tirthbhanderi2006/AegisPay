"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Card, Badge, Table, Button, Input, Select, Pagination, DecisionBadge, RiskLevelBadge } from "@/components/ui";
import { MainLayout } from "@/components/layout";

const BASE_TRANSACTIONS = [
  {
    id: "txn_001",
    decision: "BLOCK",
    score: 91.4,
    level: "HIGH",
    quality: 0.94,
    signals: 3,
    latency: 4.7,
    time: "14:31:02",
    date: "2026-08-29",
    amount: "$830.00",
    signalsList: ["payment_velocity", "device_reuse_cross_merchant", "amount_deviation"],
  },
  {
    id: "txn_vel_9021",
    decision: "CHALLENGE",
    score: 58.4,
    level: "MEDIUM",
    quality: 0.85,
    signals: 2,
    latency: 4.1,
    time: "14:30:12",
    date: "2026-08-29",
    amount: "$249.99",
    signalsList: ["velocity_burst_burst", "geolocation_distance"],
  },
  {
    id: "txn_demo_norm",
    decision: "ALLOW",
    score: 12.3,
    level: "LOW",
    quality: 0.98,
    signals: 0,
    latency: 3.2,
    time: "14:28:45",
    date: "2026-08-29",
    amount: "$42.50",
    signalsList: [],
  },
  {
    id: "txn_graph_degrade",
    decision: "CHALLENGE",
    score: 62.0,
    level: "MEDIUM",
    quality: 0.70,
    signals: 1,
    latency: 4.8,
    time: "14:26:01",
    date: "2026-08-29",
    amount: "$1,200.00",
    signalsList: ["high_amount_burst"],
  },
  {
    id: "txn_hold_audit",
    decision: "MANUAL_HOLD",
    score: 68.9,
    level: "MEDIUM",
    quality: 0.82,
    signals: 2,
    latency: 5.1,
    time: "14:22:15",
    date: "2026-08-29",
    amount: "$4,500.00",
    signalsList: ["high_ticket_probe", "new_account_risk"],
  },
];

// Generate synthetic list for high-density operational exploration
const EXTENDED_TRANSACTIONS = [
  ...BASE_TRANSACTIONS,
  ...Array.from({ length: 45 }, (_, i) => {
    const num = i + 6;
    const isHigh = i % 5 === 0;
    const isMed = i % 3 === 0 && !isHigh;
    const dec = isHigh ? "BLOCK" : isMed ? "CHALLENGE" : "ALLOW";
    const lvl = isHigh ? "HIGH" : isMed ? "MEDIUM" : "LOW";
    const score = isHigh ? 82.0 + (i % 15) : isMed ? 48.0 + (i % 20) : 8.0 + (i % 25);
    return {
      id: `txn_${String(num).padStart(4, "0")}`,
      decision: dec,
      score: Math.round(score * 10) / 10,
      level: lvl,
      quality: Math.round((0.85 + (i % 15) * 0.01) * 100) / 100,
      signals: isHigh ? 3 : isMed ? 2 : 0,
      latency: Math.round((3.2 + (i % 20) * 0.1) * 10) / 10,
      time: `14:${String(20 - Math.floor(i / 3)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
      date: "2026-08-29",
      amount: `$${((i + 1) * 37.5).toFixed(2)}`,
      signalsList: isHigh ? ["payment_velocity", "device_reuse"] : isMed ? ["amount_deviation"] : [],
    };
  }),
];

export default function TransactionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const filteredData = useMemo(() => {
    return EXTENDED_TRANSACTIONS.filter((txn) => {
      const matchesSearch =
        txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.amount.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDecision = decisionFilter === "all" || txn.decision === decisionFilter;
      const matchesLevel = levelFilter === "all" || txn.level === levelFilter;
      return matchesSearch && matchesDecision && matchesLevel;
    });
  }, [searchQuery, decisionFilter, levelFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleRowClick = (txn: any) => {
    router.push(`/investigations/${txn.id}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Transactions Explorer</h1>
            <p className="text-xs text-ink-muted mt-1">
              Deterministic real-time evaluation logs, decision breakdowns, and investigation dossiers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => alert("Exporting evaluation logs as CSV...")}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search by txn_id or amount..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="w-4 h-4 text-ink-muted" />}
          />

          <Select
            value={decisionFilter}
            options={[
              { value: "all", label: "All Decisions" },
              { value: "ALLOW", label: "ALLOW Only" },
              { value: "CHALLENGE", label: "CHALLENGE Only" },
              { value: "BLOCK", label: "BLOCK Only" },
              { value: "MANUAL_HOLD", label: "MANUAL HOLD Only" },
            ]}
            onChange={(e) => {
              setDecisionFilter(e.target.value);
              setCurrentPage(1);
            }}
          />

          <Select
            value={levelFilter}
            options={[
              { value: "all", label: "All Risk Levels" },
              { value: "LOW", label: "LOW Risk" },
              { value: "MEDIUM", label: "MEDIUM Risk" },
              { value: "HIGH", label: "HIGH Risk" },
            ]}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
          />

          <div className="flex items-center justify-end text-xs font-mono text-ink-muted">
            <span>{filteredData.length} records matched</span>
          </div>
        </div>

        {/* High-density Operational Table */}
        <Card variant="raised" padding="none">
          <Table
            columns={[
              {
                key: "id",
                header: "Transaction ID",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gold font-bold">{row.id}</span>
                  </div>
                ),
              },
              {
                key: "amount",
                header: "Amount",
                render: (row) => <span className="font-mono text-xs text-ink font-semibold">{row.amount}</span>,
              },
              {
                key: "decision",
                header: "Decision",
                width: "120px",
                render: (row) => <DecisionBadge decision={row.decision as any} size="sm" />,
              },
              {
                key: "score",
                header: "Risk Score",
                align: "center",
                width: "100px",
                render: (row) => (
                  <span className="font-mono text-xs font-bold text-ink">{row.score.toFixed(1)}</span>
                ),
              },
              {
                key: "level",
                header: "Risk Level",
                align: "center",
                width: "100px",
                render: (row) => <RiskLevelBadge level={row.level as any} size="sm" />,
              },
              {
                key: "quality",
                header: "Evidence Quality",
                align: "center",
                width: "130px",
                render: (row) => (
                  <span className="font-mono text-xs text-ink-muted">{row.quality.toFixed(2)}</span>
                ),
              },
              {
                key: "signals",
                header: "Signals",
                align: "center",
                width: "90px",
                render: (row) => (
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded text-xs font-mono font-bold",
                      row.signals > 0 ? "bg-red/10 text-red" : "text-ink-faint"
                    )}
                  >
                    {row.signals} signals
                  </span>
                ),
              },
              {
                key: "latency",
                header: "Latency",
                align: "right",
                width: "100px",
                render: (row) => (
                  <span className="font-mono text-xs text-ink-muted">{row.latency.toFixed(1)}ms</span>
                ),
              },
              {
                key: "time",
                header: "Timestamp",
                align: "right",
                width: "140px",
                render: (row) => (
                  <span className="font-mono text-xs text-ink-faint">
                    {row.date} {row.time}
                  </span>
                ),
              },
            ]}
            data={paginatedData}
            keyExtractor={(row) => row.id}
            onRowClick={handleRowClick}
            rowClassName={(row) =>
              clsx(
                "cursor-pointer hover:bg-surface-overlay/60 transition-colors",
                row.decision === "BLOCK" && "bg-red/5 hover:bg-red/10",
                row.decision === "CHALLENGE" && "bg-amber/5 hover:bg-amber/10"
              )
            }
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            showPageSize={false}
            pageSize={pageSize}
            totalItems={filteredData.length}
          />
        </Card>
      </div>
    </MainLayout>
  );
}