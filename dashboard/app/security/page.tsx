"use client";

import React, { useState } from "react";
import {
  Lock,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  UserCheck,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, Badge, Button, Select, Tabs, type TabItem } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { useRBAC } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

const PERMISSION_MATRIX = [
  { module: "Risk Ingestion & Evaluation", perm: "risk:evaluate", owner: true, admin: true, analyst: true, dev: true, viewer: false },
  { module: "Transaction Ledger View", perm: "risk:read", owner: true, admin: true, analyst: true, dev: true, viewer: true },
  { module: "Investigation Dossier Forensics", perm: "investigations:read", owner: true, admin: true, analyst: true, dev: false, viewer: true },
  { module: "Manual Decision Overrides", perm: "investigations:override", owner: true, admin: true, analyst: true, dev: false, viewer: false },
  { module: "Deterministic Replay Execution", perm: "replay:execute", owner: true, admin: true, analyst: true, dev: true, viewer: false },
  { module: "Scenario Sandbox Execution", perm: "sandbox:execute", owner: true, admin: true, analyst: false, dev: true, viewer: false },
  { module: "Webhook Endpoint Management", perm: "operations:webhooks_manage", owner: true, admin: true, analyst: false, dev: true, viewer: false },
  { module: "API Keys & Secret Reveal", perm: "security:keys_manage", owner: true, admin: true, analyst: false, dev: false, viewer: false },
  { module: "System Calibration Tuning", perm: "system:calibration_manage", owner: true, admin: false, analyst: false, dev: false, viewer: false },
];

export default function SecurityPage() {
  const { currentRole, setRole, merchantId } = useRBAC();
  const [activeTab, setActiveTab] = useState("matrix");

  const tabs: TabItem[] = [
    { value: "matrix", label: "RBAC Permission Matrix", icon: <Lock className="w-3.5 h-3.5" /> },
    { value: "audit", label: "Security Access Audit Log", icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 select-text">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
              <span>SECURITY</span>
              <span>/</span>
              <span className="font-bold text-ink">ACCESS CONTROL MATRIX</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              Role-Based Access Control (RBAC)
            </h1>
          </div>

          {/* Development Role Simulator */}
          <div className="flex items-center gap-2.5 p-2 bg-surface rounded border border-line">
            <span className="font-mono text-xs text-ink-muted">Active Role Simulation:</span>
            <select
              value={currentRole}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="bg-surface-subtle border border-line text-xs font-mono font-bold px-2 py-1 rounded text-ink focus:outline-none cursor-pointer"
            >
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="RISK_ANALYST">RISK ANALYST</option>
              <option value="DEVELOPER">DEVELOPER</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>
        </div>

        {/* Active Role Summary Card */}
        <Card variant="flat" padding="md" className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald" />
              <span className="font-mono text-xs font-bold uppercase text-ink">
                Current Authenticated Role: {currentRole}
              </span>
            </div>
            <Badge variant="neutral" size="sm">
              Tenant: {merchantId}
            </Badge>
          </div>
          <p className="text-xs text-ink-secondary leading-relaxed">
            {currentRole === "OWNER" && "Full administrative, financial, secret generation, and calibration tuning privileges."}
            {currentRole === "ADMIN" && "Full operational access, secret management, and webhook configuration."}
            {currentRole === "RISK_ANALYST" && "Risk investigation, forensic review, manual hold triage, and deterministic replay access."}
            {currentRole === "DEVELOPER" && "API reference, webhook management, idempotency debugging, and sandbox scenario execution."}
            {currentRole === "VIEWER" && "Read-only access to operational ledgers and telemetry. Actions and secret management are disabled."}
          </p>
        </Card>

        {/* Tabs */}
        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="line">
          {activeTab === "matrix" && (
            <div className="space-y-4 mt-4">
              <Card variant="flat" padding="none" className="border">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-subtle text-ink-muted uppercase text-[10px]">
                      <th className="py-2.5 px-4 font-sans font-semibold">Security Capability / Permission</th>
                      <th className="py-2.5 px-3 text-center">OWNER</th>
                      <th className="py-2.5 px-3 text-center">ADMIN</th>
                      <th className="py-2.5 px-3 text-center">ANALYST</th>
                      <th className="py-2.5 px-3 text-center">DEV</th>
                      <th className="py-2.5 px-3 text-center">VIEWER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {PERMISSION_MATRIX.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-subtle transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-sans font-semibold text-ink block">{row.module}</span>
                          <span className="font-mono text-[10px] text-ink-muted">{row.perm}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.owner ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-line-strong mx-auto" />}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.admin ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-line-strong mx-auto" />}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.analyst ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-line-strong mx-auto" />}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.dev ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-line-strong mx-auto" />}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.viewer ? <CheckCircle className="w-4 h-4 text-emerald mx-auto" /> : <XCircle className="w-4 h-4 text-line-strong mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-4 mt-4">
              <Card variant="flat" padding="md" className="space-y-2 text-xs font-mono">
                {[
                  { time: "2026-08-29T14:31:02Z", actor: "usr_admin_01", role: "ADMIN", action: "API_KEY_ROTATED", detail: "Generated ak_live_••••3A9F" },
                  { time: "2026-08-29T14:28:44Z", actor: "usr_analyst_04", role: "RISK_ANALYST", action: "DECISION_REPLAYED", detail: "Replayed txn_001 under cal_v1.4" },
                  { time: "2026-08-29T14:20:10Z", actor: "usr_dev_02", role: "DEVELOPER", action: "SANDBOX_EXECUTED", detail: "Ran scenario 'velocity' on sandbox" },
                ].map((log, i) => (
                  <div key={i} className="p-2.5 bg-surface-subtle rounded border border-line flex items-center justify-between">
                    <div>
                      <span className="font-bold text-ink">{log.action}</span>
                      <span className="text-ink-muted block text-[10px] mt-0.5">Actor: {log.actor} ({log.role}) · {log.detail}</span>
                    </div>
                    <span className="text-ink-muted text-[10px]">{new Date(log.time).toLocaleTimeString()}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
