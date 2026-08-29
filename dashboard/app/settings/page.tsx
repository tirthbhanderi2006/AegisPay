"use client";

import React, { useState } from "react";
import {
  User,
  Key,
  Shield,
  Palette,
  Bell,
  AlertTriangle,
  Plus,
  Copy,
  Trash2,
  Lock,
  Save,
  Building,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";
import { Card, Badge, Button, Input, Select, Tabs, type TabItem } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { ApiKeyModal } from "@/components/security/ApiKeyModal";
import { useRBAC, PermissionGuard } from "@/lib/rbac";
import { INITIAL_API_KEYS } from "@/lib/api";
import type { ApiKeyRecord } from "@/lib/types";

export default function SettingsPage() {
  const { currentRole, merchantId, setMerchantId } = useRBAC();
  const [activeTab, setActiveTab] = useState("api-keys");
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(INITIAL_API_KEYS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"sandbox" | "production">("sandbox");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const isProd = newKeyEnv === "production";
    const prefix = isProd ? "ak_live_" : "ak_test_";
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const fullSecret = `${prefix}${randomHex}`;

    const newRecord: ApiKeyRecord = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      key_prefix: `${prefix}••••${randomHex.slice(-4).toUpperCase()}`,
      created_at: new Date().toISOString(),
      last_used_at: null,
      merchant_id: merchantId,
      status: "active",
      environment: newKeyEnv,
    };

    setApiKeys((prev) => [newRecord, ...prev]);
    setCreatedSecret(fullSecret);
    setShowCreateModal(false);
    setNewKeyName("");
  };

  const handleRevokeKey = (keyId: string) => {
    if (confirm("Are you sure you want to revoke this API key? This action is irreversible.")) {
      setApiKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, status: "revoked" } : k))
      );
    }
  };

  const tabs: TabItem[] = [
    { value: "api-keys", label: "API Keys & Secrets", icon: <Key className="w-4 h-4" /> },
    { value: "merchant", label: "Merchant Configuration", icon: <Building className="w-4 h-4" /> },
    { value: "appearance", label: "Appearance & Theme", icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Platform Configuration & Secrets</h1>
            <p className="text-xs text-ink-muted mt-1">
              Cryptographic API key credentials, multi-tenant boundaries, and system preferences
            </p>
          </div>
        </div>

        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="pills">
          {/* Tab 1: API Keys */}
          {activeTab === "api-keys" && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-ink uppercase tracking-wider font-mono">
                    Merchant API Keys ({merchantId})
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Authenticate requests using HTTP header <code className="text-gold font-mono">X-API-Key</code> or <code className="text-gold font-mono">Authorization: Bearer &lt;key&gt;</code>
                  </p>
                </div>

                <PermissionGuard permission="security:manage_keys">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setShowCreateModal(true)}
                  >
                    Generate API Key
                  </Button>
                </PermissionGuard>
              </div>

              {/* API Key List */}
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <Card
                    key={key.id}
                    variant={key.status === "active" ? "raised" : "outlined"}
                    padding="md"
                    className={key.status === "revoked" ? "opacity-60" : ""}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center border border-gold/30 flex-shrink-0">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink">{key.name}</span>
                            <Badge variant={key.status === "active" ? "success" : "neutral"} size="sm" dot>
                              {key.status.toUpperCase()}
                            </Badge>
                            <Badge variant={key.environment === "production" ? "danger" : "info"} size="sm">
                              {key.environment.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="font-mono text-xs text-ink-muted mt-0.5 select-all">
                            {key.key_prefix}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="text-right text-ink-muted">
                          <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                          <span className="block text-[10px] text-ink-faint">
                            Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleTimeString() : "Never"}
                          </span>
                        </div>

                        {key.status === "active" && (
                          <PermissionGuard permission="security:manage_keys">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="w-3.5 h-3.5 text-red" />}
                              onClick={() => handleRevokeKey(key.id)}
                              className="text-red hover:bg-red/10 h-8"
                            >
                              Revoke
                            </Button>
                          </PermissionGuard>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Security Policy Reminder */}
              <Card variant="raised" padding="md" className="space-y-2 border-gold/30 bg-gold/5 text-xs">
                <div className="flex items-center gap-2 font-bold text-gold uppercase tracking-wider font-mono">
                  <Shield className="w-4 h-4" />
                  <span>Cryptographic Secret Protection Contract</span>
                </div>
                <ul className="space-y-1 text-ink-muted list-disc list-inside leading-relaxed">
                  <li>API keys are hashed with <strong>SHA-256</strong> prior to database persistence; plaintext keys are NEVER stored.</li>
                  <li>Plaintext secrets are displayed exactly once at creation time and can never be retrieved or re-exposed.</li>
                  <li>Merchant isolation strictly restricts each key to its corresponding merchant boundary (<code>{merchantId}</code>).</li>
                </ul>
              </Card>
            </div>
          )}

          {/* Tab 2: Merchant Configuration */}
          {activeTab === "merchant" && (
            <div className="max-w-2xl space-y-6 mt-4">
              <Card variant="raised" padding="lg" className="space-y-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                  Active Tenant Information
                </h3>
                <div className="space-y-3 text-xs">
                  <Input label="Authenticated Merchant ID" value={merchantId} disabled />
                  <Input label="Organization Legal Entity" value="Acme Payments Infrastructure Ltd." />
                  <Input label="Technical Contact Email" value="security-team@acme-payments.io" />
                  <Select
                    label="Default Risk Decisioning Policy"
                    value="policy_v2.1"
                    options={[
                      { value: "policy_v2.1", label: "policy_v2.1 (Standard Fraud & Velocity Rules)" },
                      { value: "policy_v1.0", label: "policy_v1.0 (Conservative High-Ticket Policy)" },
                    ]}
                  />
                </div>
                <Button variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
                  Save Tenant Configuration
                </Button>
              </Card>
            </div>
          )}

          {/* Tab 3: Appearance */}
          {activeTab === "appearance" && (
            <div className="max-w-2xl space-y-6 mt-4">
              <Card variant="raised" padding="lg" className="space-y-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
                  Console Theme & Visual Mode
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setTheme("dark");
                      document.documentElement.classList.add("dark");
                    }}
                    className={`p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                      theme === "dark" ? "border-gold bg-gold/10" : "border-line bg-surface-overlay"
                    }`}
                  >
                    <Moon className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-semibold text-sm text-ink">Dark Mode (Default)</p>
                      <p className="text-xs text-ink-muted">Optimized for high-density fintech operations</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setTheme("light");
                      document.documentElement.classList.remove("dark");
                    }}
                    className={`p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-colors ${
                      theme === "light" ? "border-gold bg-gold/10" : "border-line bg-surface-overlay"
                    }`}
                  >
                    <Sun className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-semibold text-sm text-ink">Light Mode</p>
                      <p className="text-xs text-ink-muted">High-contrast daytime operational view</p>
                    </div>
                  </button>
                </div>
              </Card>
            </div>
          )}
        </Tabs>

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md bg-surface-raised border border-line rounded-xl p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-ink">Generate New API Key</h3>
              <p className="text-xs text-ink-muted">
                Create an authenticated API key for merchant <code className="text-gold">{merchantId}</code>.
              </p>

              <div className="space-y-3">
                <Input
                  label="Key Name / Identifier"
                  placeholder="e.g. Production Payment Gateway"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />

                <Select
                  label="Target Environment"
                  value={newKeyEnv}
                  options={[
                    { value: "sandbox", label: "SANDBOX (Simulation & Testing)" },
                    { value: "production", label: "PRODUCTION (Live Payment Decisions)" },
                  ]}
                  onChange={(e) => setNewKeyEnv(e.target.value as any)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim()}
                >
                  Generate Secret Key
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Secure Single-Reveal API Key Modal */}
        {createdSecret && (
          <ApiKeyModal
            isOpen={!!createdSecret}
            onClose={() => setCreatedSecret(null)}
            apiKeyName={newKeyName || "Generated API Key"}
            secretPlaintext={createdSecret}
            environment={newKeyEnv}
          />
        )}
      </div>
    </MainLayout>
  );
}