"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Shield, Key, Building } from "lucide-react";
import { Card, Badge, Button, Input, Select } from "@/components/ui";
import { useRBAC } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { setRole, setMerchantId, setEnvironment } = useRBAC();

  const [apiKey, setApiKey] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("m_sandbox");
  const [selectedRole, setSelectedRole] = useState<UserRole>("ADMIN");
  const [selectedEnv, setSelectedEnv] = useState<"SANDBOX" | "PRODUCTION">("SANDBOX");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    setTimeout(() => {
      setRole(selectedRole);
      setMerchantId(selectedMerchant);
      setEnvironment(selectedEnv);
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-8 h-8 rounded bg-ink text-white flex items-center justify-center font-bold text-sm mx-auto mb-3">
            A
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink font-sans">
            Sign in to AegisPay Console
          </h1>
          <p className="text-xs text-ink-muted">
            Deterministic Payment Risk Infrastructure Control Plane
          </p>
        </div>

        {/* Login Card */}
        <Card variant="flat" padding="lg" className="border shadow-card space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Merchant API Key or Secret"
              type="password"
              placeholder="ak_live_••••••••••••••••"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              leftIcon={<Key className="w-3.5 h-3.5" />}
              helperText="Enter your merchant API key or use demo sandbox credentials"
            />

            <Select
              label="Merchant Boundary Target"
              value={selectedMerchant}
              options={[
                { value: "m_sandbox", label: "m_sandbox (Testing & Simulation)" },
                { value: "m_acme", label: "m_acme (Production Acme Gateway)" },
                { value: "m_alpha", label: "m_alpha (Alpha Multi-Tenant)" },
              ]}
              onChange={(e) => setSelectedMerchant(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Role"
                value={selectedRole}
                options={[
                  { value: "OWNER", label: "OWNER" },
                  { value: "ADMIN", label: "ADMIN" },
                  { value: "RISK_ANALYST", label: "RISK ANALYST" },
                  { value: "DEVELOPER", label: "DEVELOPER" },
                  { value: "VIEWER", label: "VIEWER" },
                ]}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              />

              <Select
                label="Environment"
                value={selectedEnv}
                options={[
                  { value: "SANDBOX", label: "SANDBOX" },
                  { value: "PRODUCTION", label: "PRODUCTION" },
                ]}
                onChange={(e) => setSelectedEnv(e.target.value as any)}
              />
            </div>

            {error && <p className="text-xs text-red">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Sign In to Control Plane
            </Button>
          </form>
        </Card>

        {/* Security Contract Footer */}
        <div className="text-center space-y-1 text-[11px] font-mono text-ink-muted">
          <p>MUTUAL TLS · SHA-256 SESSION TOKENS</p>
          <p className="text-ink-faint">ZERO RUNTIME LLM IN PAYMENT PATH</p>
        </div>
      </div>
    </div>
  );
}
