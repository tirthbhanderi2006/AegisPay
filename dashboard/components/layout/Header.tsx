"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Search,
  Bell,
  ChevronDown,
  Globe,
  Shield,
  Building,
  UserCheck,
  X,
  FlaskConical,
  Key,
  Settings,
  Lock,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Button, Avatar, Dropdown, Badge } from "@/components/ui";
import { useRBAC } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, setRole, environment, setEnvironment, merchantId, setMerchantId, currentUser } = useRBAC();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState(2);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getBreadcrumbs = () => {
    if (pathname === "/dashboard") return ["Platform", "Overview"];
    if (pathname.startsWith("/transactions")) return ["Risk Operations", "Transactions"];
    if (pathname.startsWith("/investigations")) return ["Risk Operations", "Investigation Workspace"];
    if (pathname.startsWith("/entities")) return ["Risk Operations", "Entity Intelligence"];
    if (pathname.startsWith("/replay")) return ["Risk Operations", "Deterministic Replay"];
    if (pathname.startsWith("/sandbox")) return ["Operations", "Scenario Sandbox"];
    if (pathname.startsWith("/webhooks")) return ["Operations", "Webhook Operations"];
    if (pathname.startsWith("/events")) return ["Operations", "Payment Events"];
    if (pathname.startsWith("/security")) return ["Security & Access", "Access Control (RBAC)"];
    if (pathname.startsWith("/api")) return ["Developer", "API Reference"];
    if (pathname.startsWith("/system")) return ["System", "Health & Drift Observability"];
    if (pathname.startsWith("/settings")) return ["Configuration", "Settings & Secrets"];
    return ["AegisPay", "Console"];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-surface-raised/80 backdrop-blur border-b border-line flex items-center justify-between px-4 lg:px-6">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-ink-faint">{breadcrumbs[0]}</span>
          <span className="text-ink-muted">/</span>
          <span className="text-ink font-semibold">{breadcrumbs[1]}</span>
        </div>

        {/* Center: ⌘K Global Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            leftIcon={<Search className="w-4 h-4 text-ink-muted" />}
            onClick={() => setSearchOpen(true)}
            className="justify-between text-xs text-ink-muted bg-surface-overlay/70 border border-line hover:bg-surface-overlay hover:text-ink font-mono"
          >
            <span>Search transactions, tokens, events...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-surface rounded border border-line font-mono text-ink-faint">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Environment Switcher */}
          <Dropdown
            trigger={
              <Button variant="outline" size="sm" leftIcon={<Globe className="w-3.5 h-3.5" />} className="text-xs font-mono h-8">
                {environment}
              </Button>
            }
            items={[
              { value: "SANDBOX", label: "SANDBOX (Simulation)", icon: <FlaskConical className="w-3.5 h-3.5 text-gold" /> },
              { value: "PRODUCTION", label: "PRODUCTION (Live V1)", icon: <Shield className="w-3.5 h-3.5 text-emerald" /> },
            ]}
            onSelect={(v: string) => setEnvironment(v as any)}
            align="right"
          />

          {/* Merchant Switcher */}
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm" leftIcon={<Building className="w-3.5 h-3.5 text-ink-muted" />} className="text-xs font-mono h-8">
                {merchantId}
              </Button>
            }
            items={[
              { value: "m_sandbox", label: "m_sandbox (Demo)", icon: <Building className="w-3.5 h-3.5" /> },
              { value: "m_acme", label: "m_acme_corp", icon: <Building className="w-3.5 h-3.5" /> },
              { value: "m_alpha", label: "m_alpha_payments", icon: <Building className="w-3.5 h-3.5" /> },
              { value: "m_beta", label: "m_beta_retail", icon: <Building className="w-3.5 h-3.5" /> },
            ]}
            onSelect={(v: string) => setMerchantId(v)}
            align="right"
          />

          {/* Role Switcher */}
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm" leftIcon={<UserCheck className="w-3.5 h-3.5 text-gold" />} className="text-xs font-mono h-8 hidden sm:flex">
                {currentRole}
              </Button>
            }
            items={[
              { value: "OWNER", label: "OWNER (Full Admin)", icon: <UserCheck className="w-3.5 h-3.5 text-gold" /> },
              { value: "ADMIN", label: "ADMIN (Operations)", icon: <UserCheck className="w-3.5 h-3.5 text-info" /> },
              { value: "RISK_ANALYST", label: "RISK_ANALYST (Investigations)", icon: <UserCheck className="w-3.5 h-3.5 text-purple" /> },
              { value: "DEVELOPER", label: "DEVELOPER (APIs & Keys)", icon: <UserCheck className="w-3.5 h-3.5 text-emerald" /> },
              { value: "VIEWER", label: "VIEWER (Read-Only)", icon: <UserCheck className="w-3.5 h-3.5 text-neutral" /> },
            ]}
            onSelect={(v: string) => setRole(v as UserRole)}
            align="right"
          />

          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifications(0)}
            aria-label="Notifications"
            className="relative h-8 w-8"
          >
            <Bell className="w-4 h-4 text-ink" />
            {notifications > 0 && (
              <span className="absolute 1 top-1 right-1 w-2 h-2 bg-gold rounded-full" />
            )}
          </Button>

          {/* User Profile Dropdown */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-surface-overlay transition-colors">
                <Avatar name={currentUser.name} size="sm" />
              </button>
            }
            items={[
              { value: "security", label: "Access Control & Roles", icon: <Lock className="w-3.5 h-3.5" /> },
              { value: "api-keys", label: "API Keys & Webhooks", icon: <Key className="w-3.5 h-3.5" /> },
              { value: "settings", label: "Platform Settings", icon: <Settings className="w-3.5 h-3.5" /> },
              { divider: true },
              { value: "landing", label: "Landing Page & Demo", icon: <ExternalLink className="w-3.5 h-3.5" /> },
            ]}
            onSelect={(v: string) => {
              if (v === "landing") router.push("/landing");
              else if (v === "security") router.push("/security");
              else if (v === "api-keys") router.push("/settings");
              else if (v === "settings") router.push("/settings");
            }}
            align="right"
          />
        </div>
      </header>

      {/* ⌘K Global Search Dialog */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/80 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl mx-4 bg-surface-raised border border-line rounded-xl shadow-2xl overflow-hidden animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-line flex items-center gap-3">
              <Search className="w-5 h-5 text-gold flex-shrink-0" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    if (searchQuery.includes("dev_") || searchQuery.includes("ip_")) {
                      router.push("/entities");
                    } else {
                      router.push(`/investigations/${searchQuery.trim()}`);
                    }
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search transaction ID (txn_...), token (dev_...), or event..."
                className="flex-1 bg-transparent text-ink placeholder-ink-muted font-mono text-sm focus:outline-none"
              />
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                <X className="w-4 h-4 text-ink-muted" />
              </Button>
            </div>

            <div className="p-3 text-xs font-mono space-y-1">
              <p className="px-2 py-1 text-[10px] text-ink-faint uppercase font-bold tracking-wider">Quick Jump</p>
              {[
                { id: "txn_001", label: "txn_001 (Velocity Anomaly Investigation)", path: "/investigations/txn_001" },
                { id: "txn_vel_9021", label: "txn_vel_9021 (Deterministic Replay)", path: "/replay/txn_vel_9021" },
                { id: "dev_91A2", label: "dev_••••91A2 (Cross-Merchant Entity Graph)", path: "/entities" },
                { id: "sandbox", label: "Run Synthetic Sandbox Scenario", path: "/sandbox" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.path);
                    setSearchOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-left text-ink hover:bg-surface-overlay hover:text-gold transition-colors flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-ink-faint">Jump &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}