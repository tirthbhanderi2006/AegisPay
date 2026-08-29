"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  UserCheck,
  Shield,
  Key,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import { MainLayout } from "@/components/layout";
import { Card, Badge, Button, Table, Tabs, type TabItem } from "@/components/ui";
import { useRBAC, PermissionGuard } from "@/lib/rbac";
import type { UserRole, RBACUser, SecurityEventRecord } from "@/lib/types";

const PERMISSION_MATRIX: { module: string; action: string; owner: boolean; admin: boolean; analyst: boolean; dev: boolean; viewer: boolean }[] = [
  { module: "Risk Operations", action: "Evaluate Real-time Transactions", owner: true, admin: true, analyst: true, dev: true, viewer: false },
  { module: "Risk Operations", action: "Trigger Deterministic Replay", owner: true, admin: true, analyst: true, dev: true, viewer: false },
  { module: "Risk Operations", action: "Inspect Cross-Merchant Entities", owner: true, admin: true, analyst: true, dev: false, viewer: true },
  { module: "Scenario Sandbox", action: "Execute Adversarial Scenarios", owner: true, admin: true, analyst: true, dev: true, viewer: false },
  { module: "Webhook Operations", action: "Register / Rotate Secret Subscriptions", owner: true, admin: true, analyst: false, dev: true, viewer: false },
  { module: "Security & API Keys", action: "Generate & Revoke API Keys", owner: true, admin: true, analyst: false, dev: true, viewer: false },
  { module: "Access Control", action: "Manage Team Members & Role Assignments", owner: true, admin: true, analyst: false, dev: false, viewer: false },
  { module: "System & Health", action: "Modify Drift Thresholds & Configs", owner: true, admin: true, analyst: false, dev: false, viewer: false },
];

const MOCK_SECURITY_EVENTS: SecurityEventRecord[] = [
  {
    id: "sec_evt_01",
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    actor: "s.jenkins@acme-payments.io (OWNER)",
    action: "API_KEY_CREATED",
    target: "ak_live_••••891A (Production)",
    ip_address: "103.21.244.12",
    status: "success",
    details: "Generated production gateway credentials with SHA-256 validation.",
  },
  {
    id: "sec_evt_02",
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    actor: "a.thorne@acme-payments.io (RISK_ANALYST)",
    action: "TRANSACTION_REPLAY_EXECUTED",
    target: "txn_vel_9021 (Delta: 0.00)",
    ip_address: "103.21.244.18",
    status: "success",
    details: "Re-evaluated historical calibration config cal_v1.4.",
  },
  {
    id: "sec_evt_03",
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    actor: "ak_test_alpha_456 (Merchant Alpha)",
    action: "CROSS_MERCHANT_ACCESS_ATTEMPT",
    target: "txn_sandbox_001 (m_sandbox)",
    ip_address: "198.51.100.44",
    status: "denied",
    details: "Enforced hard multi-tenant boundary: HTTP 403 FORBIDDEN.",
  },
  {
    id: "sec_evt_04",
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    actor: "d.chen@acme-payments.io (DEVELOPER)",
    action: "WEBHOOK_ENDPOINT_UPDATED",
    target: "https://merchant.example.com/webhook",
    ip_address: "103.21.244.20",
    status: "success",
    details: "HMAC-SHA256 signature secret rotated.",
  },
];

export default function SecurityPage() {
  const { users, setUsers, currentRole } = useRBAC();
  const [activeTab, setActiveTab] = useState("team");

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const tabs: TabItem[] = [
    { value: "team", label: "Team & Role Assignments", icon: <UserCheck className="w-4 h-4" /> },
    { value: "matrix", label: "RBAC Permission Matrix", icon: <Lock className="w-4 h-4" /> },
    { value: "audit", label: "Security Audit Log", icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Access Control & Security</h1>
            <p className="text-sm text-ink-muted mt-1">
              Multi-tenant role-based access control (RBAC), permission boundaries, and audit trail
            </p>
          </div>

          <PermissionGuard permission="security:manage_users">
            <Button variant="primary" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
              Invite Team Member
            </Button>
          </PermissionGuard>
        </div>

        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="pills">
          {/* Tab 1: Team & Roles */}
          {activeTab === "team" && (
            <div className="space-y-4 mt-6">
              <Card variant="raised" padding="none">
                <Table
                  columns={[
                    {
                      key: "name",
                      header: "User",
                      render: (row: RBACUser) => (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs font-mono">
                            {row.avatar || row.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-ink">{row.name}</p>
                            <p className="text-xs text-ink-muted font-mono">{row.email}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "role",
                      header: "Assigned Role",
                      render: (row: RBACUser) => (
                        <Badge
                          variant={
                            row.role === "OWNER"
                              ? "gold"
                              : row.role === "ADMIN"
                              ? "info"
                              : row.role === "RISK_ANALYST"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {row.role}
                        </Badge>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (row: RBACUser) => (
                        <Badge variant={row.status === "active" ? "success" : "neutral"} size="sm" dot>
                          {row.status.toUpperCase()}
                        </Badge>
                      ),
                    },
                    {
                      key: "last_active",
                      header: "Last Active",
                      render: (row: RBACUser) => (
                        <span className="text-xs font-mono text-ink-muted">{row.last_active}</span>
                      ),
                    },
                    {
                      key: "actions",
                      header: "Manage Role",
                      align: "right",
                      render: (row: RBACUser) => (
                        <PermissionGuard
                          permission="security:manage_users"
                          fallback={<span className="text-xs text-ink-faint font-mono">Restricted</span>}
                        >
                          <select
                            value={row.role}
                            onChange={(e) => handleRoleChange(row.id, e.target.value as UserRole)}
                            className="text-xs bg-surface-overlay border border-line rounded px-2 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-gold font-mono"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="RISK_ANALYST">RISK_ANALYST</option>
                            <option value="DEVELOPER">DEVELOPER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        </PermissionGuard>
                      ),
                    },
                  ]}
                  data={users}
                  keyExtractor={(row) => row.id}
                />
              </Card>
            </div>
          )}

          {/* Tab 2: RBAC Matrix */}
          {activeTab === "matrix" && (
            <div className="space-y-4 mt-6">
              <Card variant="raised" padding="none">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-surface-overlay/80 text-ink-muted uppercase">
                        <th className="py-3 px-4 font-semibold">Capability / Action</th>
                        <th className="py-3 px-4 text-center">OWNER</th>
                        <th className="py-3 px-4 text-center">ADMIN</th>
                        <th className="py-3 px-4 text-center">RISK_ANALYST</th>
                        <th className="py-3 px-4 text-center">DEVELOPER</th>
                        <th className="py-3 px-4 text-center">VIEWER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {PERMISSION_MATRIX.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-overlay/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-[10px] uppercase text-gold font-bold block">{row.module}</span>
                            <span className="text-ink font-medium font-sans text-sm">{row.action}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.owner ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-ink-faint mx-auto" />}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.admin ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-ink-faint mx-auto" />}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.analyst ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-ink-faint mx-auto" />}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.dev ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-ink-faint mx-auto" />}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.viewer ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-ink-faint mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 3: Security Audit Log */}
          {activeTab === "audit" && (
            <div className="space-y-4 mt-6">
              <Card variant="raised" padding="none">
                <Table
                  columns={[
                    {
                      key: "timestamp",
                      header: "Timestamp",
                      width: "160px",
                      render: (row: SecurityEventRecord) => (
                        <span className="text-xs font-mono text-ink-muted">
                          {new Date(row.timestamp).toLocaleTimeString()}
                        </span>
                      ),
                    },
                    {
                      key: "action",
                      header: "Action / Event",
                      render: (row: SecurityEventRecord) => (
                        <div>
                          <span className="font-mono text-xs font-semibold text-ink">{row.action}</span>
                          <p className="text-[11px] text-ink-muted font-sans mt-0.5">{row.details}</p>
                        </div>
                      ),
                    },
                    {
                      key: "actor",
                      header: "Actor",
                      render: (row: SecurityEventRecord) => (
                        <span className="text-xs font-mono text-ink-muted">{row.actor}</span>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      align: "center",
                      render: (row: SecurityEventRecord) => (
                        <Badge
                          variant={row.status === "success" ? "success" : row.status === "denied" ? "danger" : "warning"}
                          size="sm"
                          dot
                        >
                          {row.status.toUpperCase()}
                        </Badge>
                      ),
                    },
                    {
                      key: "ip_address",
                      header: "Origin IP",
                      align: "right",
                      render: (row: SecurityEventRecord) => (
                        <span className="text-xs font-mono text-ink-faint select-all">{row.ip_address}</span>
                      ),
                    },
                  ]}
                  data={MOCK_SECURITY_EVENTS}
                  keyExtractor={(row) => row.id}
                />
              </Card>
            </div>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
