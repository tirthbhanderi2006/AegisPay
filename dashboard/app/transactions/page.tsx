"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  ArrowRight,
  Shield,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Input,
  Select,
  Table,
  Pagination,
  DecisionBadge,
  RiskLevelBadge,
} from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { PrivacyToken } from "@/components/security/PrivacyToken";
import { useRBAC } from "@/lib/rbac";
import type { RiskEvaluationResponse, DecisionAction, RiskLevel } from "@/lib/types";

const INITIAL_TRANSACTIONS: RiskEvaluationResponse[] = [
  {
    transaction_id: "txn_001",
    decision_id: "dec_txn_001_1787823879",
    decision: "BLOCK",
    risk_score: 0.914,
    risk_level: "HIGH",
    evidence_quality: 0.94,
    signals: [
      { name: "payment_velocity", severity: "high", value: 12, contribution: 0.35, description: "12 rapid payment attempts within 2m window." },
      { name: "behavioral_deviation", severity: "high", value: 0.87, contribution: 0.28, description: "Cadence deviates >3.4σ from legitimate customer baseline." },
    ],
    explanation: [
      "Elevated transaction velocity observed (12 attempts in 2m window).",
      "Behavioral interaction cadence deviates >3.4σ from legitimate customer baseline.",
    ],
    versions: { calibration: "cal_v1.4", policy: "policy_v2.1", graph_snapshot: "graph-live", schema_version: "features_v3" },
    audit: { snapshot_id: "snap_txn_001", decision_hash: "a4f891b2c3d4e5f67890123456789abcdefa4f891b2c3d4e5f67890123456789abc", recorded: true },
    calibration_version: "cal_v1.4",
    request_id: "req_001_live",
    latency_ms: 4.7,
    created_at: "2026-08-29T14:31:02Z",
  },
  {
    transaction_id: "txn_vel_9021",
    decision_id: "dec_txn_vel_9021_1787823850",
    decision: "CHALLENGE",
    risk_score: 0.584,
    risk_level: "MEDIUM",
    evidence_quality: 0.89,
    signals: [
      { name: "cadence_jitter", severity: "medium", value: 0.54, contribution: 0.22, description: "Unusual typing cadence observed on checkout form." },
    ],
    explanation: ["Moderate behavioral deviation; step-up 3DS authentication requested."],
    versions: { calibration: "cal_v1.4", policy: "policy_v2.1", graph_snapshot: "graph-live", schema_version: "features_v3" },
    audit: { snapshot_id: "snap_txn_vel_9021", decision_hash: "5b129cd871239847129837192837129837198273918273918273918273918273", recorded: true },
    calibration_version: "cal_v1.4",
    request_id: "req_vel_9021",
    latency_ms: 3.8,
    created_at: "2026-08-29T14:30:12Z",
  },
  {
    transaction_id: "txn_demo_norm",
    decision_id: "dec_txn_demo_norm_1787823810",
    decision: "ALLOW",
    risk_score: 0.082,
    risk_level: "LOW",
    evidence_quality: 0.98,
    signals: [],
    explanation: ["Low-risk domestic transaction conforming to historical pattern."],
    versions: { calibration: "cal_v1.4", policy: "policy_v2.1", graph_snapshot: "graph-live", schema_version: "features_v3" },
    audit: { snapshot_id: "snap_txn_demo_norm", decision_hash: "7f891a2b3c4d5e6f7a8b9c0d1e2f3a4b7f891a2b3c4d5e6f7a8b9c0d1e2f3a4b", recorded: true },
    calibration_version: "cal_v1.4",
    request_id: "req_norm_01",
    latency_ms: 2.9,
    created_at: "2026-08-29T14:28:44Z",
  },
  {
    transaction_id: "txn_hold_audit",
    decision_id: "dec_txn_hold_audit_1787823790",
    decision: "MANUAL_HOLD",
    risk_score: 0.689,
    risk_level: "MEDIUM",
    evidence_quality: 0.72,
    signals: [
      { name: "high_ticket_novel_geo", severity: "medium", value: 4500, contribution: 0.25, description: "High ticket cross-border checkout." },
    ],
    explanation: ["High-ticket international order requires secondary compliance review."],
    versions: { calibration: "cal_v1.4", policy: "policy_v2.1", graph_snapshot: "graph-live", schema_version: "features_v3" },
    audit: { snapshot_id: "snap_txn_hold_audit", decision_hash: "8e8ec6c7d1bd02e7fe9d2b535b92ce993a4cfacbb228b8ec2cf018df8161ecbb", recorded: true },
    calibration_version: "cal_v1.4",
    request_id: "req_hold_audit",
    latency_ms: 4.1,
    created_at: "2026-08-29T14:22:15Z",
  },
];

export default function TransactionsPage() {
  const router = useRouter();
  const { merchantId } = useRBAC();

  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    return INITIAL_TRANSACTIONS.filter((txn) => {
      const matchSearch =
        txn.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.decision_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDecision = decisionFilter === "all" || txn.decision as string === decisionFilter;
      const matchRiskLevel = riskLevelFilter === "all" || txn.risk_level as string === riskLevelFilter;
      return matchSearch && matchDecision && matchRiskLevel;
    });
  }, [searchQuery, decisionFilter, riskLevelFilter]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <MainLayout>
      <div className="space-y-6 select-text">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
              <span>LEDGER</span>
              <span>/</span>
              <span className="font-bold text-ink">{merchantId}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              Evaluated Transaction Ledger
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => alert("Exporting transactions ledger...")}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search txn_id or dec_id..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-ink-muted" />}
          />

          <Select
            options={[
              { value: "all", label: "All Decisions" },
              { value: "ALLOW", label: "ALLOW" },
              { value: "CHALLENGE", label: "CHALLENGE" },
              { value: "BLOCK", label: "BLOCK" },
              { value: "MANUAL_HOLD", label: "MANUAL_HOLD" },
            ]}
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
          />

          <Select
            options={[
              { value: "all", label: "All Risk Levels" },
              { value: "LOW", label: "LOW RISK" },
              { value: "MEDIUM", label: "MEDIUM RISK" },
              { value: "HIGH", label: "HIGH RISK" },
            ]}
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
          />

          <div className="flex items-center justify-end font-mono text-xs text-ink-muted">
            <span>{filteredData.length} records found</span>
          </div>
        </div>

        {/* High-density Ledger Table */}
        <Card variant="flat" padding="none" className="border">
          <Table
            columns={[
              {
                key: "transaction_id",
                header: "Transaction Ref",
                render: (row: RiskEvaluationResponse) => (
                  <div>
                    <span className="font-mono text-xs font-semibold text-ink block">
                      {row.transaction_id}
                    </span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {row.request_id}
                    </span>
                  </div>
                ),
              },
              {
                key: "decision",
                header: "Decision",
                align: "center",
                render: (row: RiskEvaluationResponse) => (
                  <DecisionBadge decision={row.decision} size="sm" />
                ),
              },
              {
                key: "risk_score",
                header: "Risk Score",
                align: "center",
                render: (row: RiskEvaluationResponse) => (
                  <span className="font-mono text-xs font-bold text-ink">
                    {(row.risk_score <= 1.0 ? row.risk_score * 100 : row.risk_score).toFixed(1)}
                  </span>
                ),
              },
              {
                key: "risk_level",
                header: "Severity",
                align: "center",
                render: (row: RiskEvaluationResponse) => (
                  <RiskLevelBadge level={row.risk_level} size="sm" />
                ),
              },
              {
                key: "evidence_quality",
                header: "Evidence",
                align: "center",
                render: (row: RiskEvaluationResponse) => (
                  <span className="font-mono text-xs text-emerald font-semibold">
                    {(row.evidence_quality * 100).toFixed(0)}%
                  </span>
                ),
              },
              {
                key: "latency_ms",
                header: "Latency",
                align: "right",
                render: (row: RiskEvaluationResponse) => (
                  <span className="font-mono text-xs text-ink-muted">
                    {row.latency_ms.toFixed(1)}ms
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Action",
                align: "right",
                render: (row: RiskEvaluationResponse) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/investigations/${row.transaction_id}`);
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="h-7 text-xs"
                  >
                    Investigate
                  </Button>
                ),
              },
            ]}
            data={paginatedData}
            keyExtractor={(row) => row.transaction_id}
            onRowClick={(row) => router.push(`/investigations/${row.transaction_id}`)}
            rowClassName={() => "cursor-pointer hover:bg-surface-subtle transition-colors"}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
          />
        </Card>
      </div>
    </MainLayout>
  );
}