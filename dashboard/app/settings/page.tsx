"use client";

import React, { useState } from "react";
import {
  Key,
  Shield,
  Building,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Check,
} from "lucide-react";
import { Card, Badge, Button, Input, Select, Tabs, type TabItem } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { ApiKeyModal } from "@/components/security/ApiKeyModal";
import { useRBAC, PermissionGuard } from "@/lib/rbac";

export default function SettingsPage() {
  const { merchantId, setMerchantId, environment, setEnvironment, currentRole } = useRBAC();
  const [activeTab, setActiveTab] = useState("keys");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string; prefix: string } | null>(null);

  const handleGenerateKey = () => {
    const rawSecret = `ak_live_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    setNewKeyData({
      key: rawSecret,
      name: "Production Gateway Checkout Key",
      prefix: rawSecret.slice(0, 12),
    });
    setShowKeyModal(true);
  };

  const tabs: TabItem[] = [
    { value: "keys", label: "API Keys & Secrets", icon: <Key className="w-3.5 h-3.5" /> },
    { value: "merchant", label: "Merchant Boundary", icon: <Building className="w-3.5 h-3.5" /> },
    { value: "policy", label: "Frozen Calibration Rules", icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 select-text">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
              <span>CONFIGURATION</span>
              <span>/</span>
              <span className="font-bold text-ink">{merchantId}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              Platform Configuration & Secrets
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <PermissionGuard permission="security:manage_keys">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleGenerateKey}
              >
                Generate New API Key
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="line">
          {/* Tab 1: Keys */}
          {activeTab === "keys" && (
            <div className="space-y-4 mt-4">
              <div className="p-3.5 bg-surface-subtle rounded border border-line flex items-start gap-2.5 text-xs">
                <Lock className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-ink uppercase text-[11px] block">
                    Single-Reveal Secret Policy
                  </span>
                  <p className="text-ink-secondary leading-relaxed">
                    API secrets and private signing keys are displayed exactly once at generation time. AegisPay stores only irreversible cryptographic hashes.
                  </p>
                </div>
              </div>

              <Card variant="flat" padding="none" className="border">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-surface-subtle text-ink-muted uppercase text-[10px]">
                      <th className="py-2.5 px-4 font-sans font-semibold">Key Identifier</th>
                      <th className="py-2.5 px-3">Prefix / Hash</th>
                      <th className="py-2.5 px-3">Role / Scope</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {[
                      { name: "Checkout Gateway API Key", prefix: "ak_live_••••3A9F", role: "FULL_EVALUATE", created: "2026-08-20", active: true },
                      { name: "Risk Analyst Readonly Key", prefix: "ak_live_••••8812", role: "READ_ONLY", created: "2026-08-15", active: true },
                      { name: "Legacy V1 Gateway Key", prefix: "ak_live_••••1102", role: "FULL_EVALUATE", created: "2026-06-01", active: false },
                    ].map((k, idx) => (
                      <tr key={idx} className="hover:bg-surface-subtle transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-ink">{k.name}</td>
                        <td className="py-3 px-3 text-ink select-all">{k.prefix}</td>
                        <td className="py-3 px-3 text-ink-secondary">{k.role}</td>
                        <td className="py-3 px-3 text-ink-muted">{k.created}</td>
                        <td className="py-3 px-3 text-right">
                          <Badge variant={k.active ? "success" : "neutral"} size="sm" dot={k.active}>
                            {k.active ? "ACTIVE" : "REVOKED"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Tab 2: Merchant Boundary */}
          {activeTab === "merchant" && (
            <div className="space-y-4 mt-4">
              <Card variant="flat" padding="lg" className="space-y-4 max-w-2xl">
                <h3 className="text-sm font-bold text-ink">Merchant Partitioning</h3>
                <div className="space-y-3">
                  <Select
                    label="Active Merchant ID"
                    value={merchantId}
                    options={[
                      { value: "m_sandbox", label: "m_sandbox (Isolated Development Sandbox)" },
                      { value: "m_acme", label: "m_acme (Production Acme Gateway)" },
                      { value: "m_alpha", label: "m_alpha (Multi-Tenant Alpha)" },
                    ]}
                    onChange={(e) => setMerchantId(e.target.value)}
                  />

                  <Select
                    label="Execution Environment"
                    value={environment}
                    options={[
                      { value: "SANDBOX", label: "SANDBOX (Simulation mode)" },
                      { value: "PRODUCTION", label: "PRODUCTION (Live evaluation mode)" },
                    ]}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Tab 3: Policy */}
          {activeTab === "policy" && (
            <div className="space-y-4 mt-4">
              <Card variant="flat" padding="md" className="space-y-3 max-w-2xl text-xs font-mono">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Frozen Risk Calibration Parameters
                </h3>
                <div className="p-3 bg-surface-subtle rounded border border-line space-y-2">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Calibration Matrix Version:</span>
                    <span className="font-bold text-ink">cal_v1.4 (FROZEN)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">ALLOW Threshold Cutoff:</span>
                    <span className="font-bold text-emerald">Score &lt; 0.4000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">CHALLENGE (3DS) Window:</span>
                    <span className="font-bold text-amber">0.4000 &le; Score &lt; 0.7000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">BLOCK Threshold Cutoff:</span>
                    <span className="font-bold text-red">Score &ge; 0.7000</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Tabs>

        {/* Single-reveal Secret Modal */}
        {newKeyData && (
          <ApiKeyModal
            isOpen={showKeyModal}
            onClose={() => {
              setShowKeyModal(false);
              setNewKeyData(null);
            }}
            apiKeyName={newKeyData.name}
            secretPlaintext={newKeyData.key}
            environment={environment.toLowerCase()}
          />
        )}
      </div>
    </MainLayout>
  );
}