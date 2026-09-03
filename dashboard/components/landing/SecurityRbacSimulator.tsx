"use client";

import React, { useState } from "react";
import { Shield, Key, Lock, UserCheck, Eye, Database, Code, Check, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";

type RoleType = "OWNER" | "ADMIN" | "RISK_ANALYST" | "DEVELOPER" | "VIEWER";

interface RoleDetails {
  name: string;
  badge: string;
  badgeVariant: "neutral" | "info" | "success" | "warning" | "danger";
  description: string;
  permissions: {
    evaluateRisk: boolean;
    investigateEntities: boolean;
    overrideDispute: boolean;
    rotateApiKeys: boolean;
    manageWebhooks: boolean;
    accessAuditLedger: boolean;
    viewBilling: boolean;
  };
}

const ROLES: Record<RoleType, RoleDetails> = {
  OWNER: {
    name: "Owner / Executive",
    badge: "FULL ACCESS",
    badgeVariant: "danger",
    description: "Complete organizational control, cryptographic key rotation, and merchant boundaries.",
    permissions: {
      evaluateRisk: true,
      investigateEntities: true,
      overrideDispute: true,
      rotateApiKeys: true,
      manageWebhooks: true,
      accessAuditLedger: true,
      viewBilling: true,
    },
  },
  ADMIN: {
    name: "Risk Operations Admin",
    badge: "ADMIN PRIVILEGES",
    badgeVariant: "warning",
    description: "Manages calibration configurations, policy thresholds, and analyst investigator teams.",
    permissions: {
      evaluateRisk: true,
      investigateEntities: true,
      overrideDispute: true,
      rotateApiKeys: false,
      manageWebhooks: true,
      accessAuditLedger: true,
      viewBilling: false,
    },
  },
  RISK_ANALYST: {
    name: "Senior Risk Analyst",
    badge: "ANALYST INVESTIGATION",
    badgeVariant: "info",
    description: "Performs deep forensic investigations, timeline re-evaluations, and manual chargeback review.",
    permissions: {
      evaluateRisk: true,
      investigateEntities: true,
      overrideDispute: true,
      rotateApiKeys: false,
      manageWebhooks: false,
      accessAuditLedger: true,
      viewBilling: false,
    },
  },
  DEVELOPER: {
    name: "Integration Engineer",
    badge: "DEVELOPER ACCESS",
    badgeVariant: "info",
    description: "Configures REST API webhooks, HMAC signature verification, and sandbox testing scenarios.",
    permissions: {
      evaluateRisk: true,
      investigateEntities: false,
      overrideDispute: false,
      rotateApiKeys: true,
      manageWebhooks: true,
      accessAuditLedger: false,
      viewBilling: false,
    },
  },
  VIEWER: {
    name: "Compliance Auditor",
    badge: "READ-ONLY",
    badgeVariant: "neutral",
    description: "Read-only access to immutable SHA-256 audit logs and historical replay records.",
    permissions: {
      evaluateRisk: false,
      investigateEntities: false,
      overrideDispute: false,
      rotateApiKeys: false,
      manageWebhooks: false,
      accessAuditLedger: true,
      viewBilling: false,
    },
  },
};

export function SecurityRbacSimulator({ className = "" }: { className?: string }) {
  const [activeRole, setActiveRole] = useState<RoleType>("RISK_ANALYST");
  const role = ROLES[activeRole];

  return (
    <div className={`p-6 sm:p-8 bg-surface rounded-xl border border-line shadow-card space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-accent font-bold">
            <Shield className="w-4 h-4 text-accent" />
            <span>ROLE-BASED ACCESS CONTROL (RBAC)</span>
          </div>
          <h3 className="text-2xl font-bold text-ink tracking-tight">
            Cryptographic Merchant Isolation & Multi-Role Governance
          </h3>
          <p className="text-sm text-ink-secondary max-w-2xl">
            Select any enterprise role below to preview how UI actions, sensitive token visibility, key generation, and manual override capabilities dynamically adapt.
          </p>
        </div>
      </div>

      {/* Role Switcher Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {(Object.keys(ROLES) as RoleType[]).map((rKey) => {
          const isSelected = activeRole === rKey;
          const r = ROLES[rKey];
          return (
            <button
              key={rKey}
              onClick={() => setActiveRole(rKey)}
              className={`p-3 rounded-lg border text-left transition-all font-mono text-xs ${
                isSelected
                  ? "bg-surface border-ink shadow-card ring-1 ring-ink/20 font-bold text-ink"
                  : "bg-surface-subtle border-line text-ink-secondary hover:text-ink hover:bg-surface"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span>{rKey}</span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
              </div>
              <span className="text-[10px] text-ink-muted block truncate font-sans">{r.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Role Permission Matrix Card */}
      <div className="p-6 bg-surface-subtle rounded-xl border border-line space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div>
            <h4 className="font-bold text-base text-ink">{role.name} Active Context</h4>
            <p className="text-xs text-ink-secondary mt-0.5">{role.description}</p>
          </div>
          <Badge variant={role.badgeVariant} size="md">
            {role.badge}
          </Badge>
        </div>

        {/* Permissions Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          <div className={`p-3.5 rounded border flex items-center justify-between ${
            role.permissions.evaluateRisk ? "bg-emerald-bg border-emerald-border text-emerald font-bold" : "bg-surface border-line text-ink-faint"
          }`}>
            <span>Evaluate Transactions</span>
            {role.permissions.evaluateRisk ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>

          <div className={`p-3.5 rounded border flex items-center justify-between ${
            role.permissions.investigateEntities ? "bg-emerald-bg border-emerald-border text-emerald font-bold" : "bg-surface border-line text-ink-faint"
          }`}>
            <span>Investigate 3D Entities</span>
            {role.permissions.investigateEntities ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>

          <div className={`p-3.5 rounded border flex items-center justify-between ${
            role.permissions.overrideDispute ? "bg-emerald-bg border-emerald-border text-emerald font-bold" : "bg-surface border-line text-ink-faint"
          }`}>
            <span>Manual Dispute Override</span>
            {role.permissions.overrideDispute ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>

          <div className={`p-3.5 rounded border flex items-center justify-between ${
            role.permissions.rotateApiKeys ? "bg-emerald-bg border-emerald-border text-emerald font-bold" : "bg-surface border-line text-ink-faint"
          }`}>
            <span>Rotate API Secret Keys</span>
            {role.permissions.rotateApiKeys ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>

          <div className={`p-3.5 rounded border flex items-center justify-between ${
            role.permissions.manageWebhooks ? "bg-emerald-bg border-emerald-border text-emerald font-bold" : "bg-surface border-line text-ink-faint"
          }`}>
            <span>Configure HMAC Webhooks</span>
            {role.permissions.manageWebhooks ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>

          <div className={`p-3.5 rounded border flex items-center justify-between ${
            role.permissions.accessAuditLedger ? "bg-emerald-bg border-emerald-border text-emerald font-bold" : "bg-surface border-line text-ink-faint"
          }`}>
            <span>SHA-256 Audit Ledger Access</span>
            {role.permissions.accessAuditLedger ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>
        </div>
      </div>
    </div>
  );
}
