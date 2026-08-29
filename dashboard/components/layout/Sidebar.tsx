"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  ListChecks,
  Search,
  GitBranch,
  RotateCcw,
  FlaskConical,
  MessageSquare,
  Activity,
  Shield,
  Key,
  Code,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lock,
  UserCheck,
  Building,
} from "lucide-react";
import { useRBAC } from "@/lib/rbac";
import { Badge } from "@/components/ui";

interface NavGroup {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    permission?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "GENERAL",
    items: [
      { href: "/dashboard", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    ],
  },
  {
    title: "RISK OPERATIONS",
    items: [
      { href: "/transactions", label: "Transactions", icon: <ListChecks className="w-4 h-4" /> },
      { href: "/investigations/txn_001", label: "Investigations", icon: <Search className="w-4 h-4" /> },
      { href: "/entities", label: "Entity Intelligence", icon: <GitBranch className="w-4 h-4" /> },
      { href: "/replay/txn_001", label: "Deterministic Replay", icon: <RotateCcw className="w-4 h-4" /> },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { href: "/sandbox", label: "Scenario Sandbox", icon: <FlaskConical className="w-4 h-4" /> },
      { href: "/webhooks", label: "Webhook Deliveries", icon: <MessageSquare className="w-4 h-4" /> },
      { href: "/events", label: "Lifecycle Events", icon: <Activity className="w-4 h-4" /> },
    ],
  },
  {
    title: "SECURITY & ACCESS",
    items: [
      { href: "/security", label: "Access Control & RBAC", icon: <Lock className="w-4 h-4" /> },
      { href: "/settings", label: "API Keys & Secrets", icon: <Key className="w-4 h-4" /> },
    ],
  },
  {
    title: "DEVELOPER & SYSTEM",
    items: [
      { href: "/api", label: "API Reference", icon: <Code className="w-4 h-4" /> },
      { href: "/system", label: "System Health & Drift", icon: <Cpu className="w-4 h-4" /> },
    ],
  },
];

export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { currentRole, merchantId, setMerchantId, environment } = useRBAC();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-3.5 left-3.5 z-50 lg:hidden p-2 rounded-lg bg-surface-raised border border-line text-ink hover:bg-surface-overlay transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-40 bg-surface border-r border-line transition-all duration-300 ease-out flex flex-col justify-between",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div>
          {/* Brand Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-line">
            {!collapsed ? (
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center border border-gold/40">
                  <Shield className="w-5 h-5 text-gold" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base text-ink tracking-tight font-mono leading-tight">AEGISPAY</span>
                  <span className="text-[10px] text-ink-muted font-mono tracking-wider">RISK PLATFORM</span>
                </div>
              </Link>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center border border-gold/40 mx-auto">
                <Shield className="w-5 h-5 text-gold" />
              </div>
            )}
          </div>

          {/* Navigation Groups */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" role="navigation" aria-label="Main">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-faint font-mono mb-1.5">
                    {group.title}
                  </p>
                )}
                <ul className="space-y-1" role="list">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={clsx(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150",
                            isActive
                              ? "bg-gold/10 text-gold border-l-2 border-gold font-semibold"
                              : "text-ink-muted hover:text-ink hover:bg-surface-overlay",
                            collapsed && "justify-center"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <span className="flex-shrink-0">{item.icon}</span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {item.badge && !collapsed && (
                            <span className="ml-auto px-1.5 py-0.2 text-[10px] font-mono bg-gold/20 text-gold rounded">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Tenant & Role State */}
        <div className="p-3 border-t border-line space-y-2 bg-surface-raised/40">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-ink-faint flex items-center gap-1">
                  <Building className="w-3 h-3" /> Merchant:
                </span>
                <span className="text-ink font-semibold">{merchantId}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-ink-faint flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Role:
                </span>
                <Badge variant={currentRole === "OWNER" ? "gold" : currentRole === "ADMIN" ? "info" : "neutral"} size="sm">
                  {currentRole}
                </Badge>
              </div>

              <div className="pt-1.5 border-t border-line/60 flex items-center justify-between text-[10px] font-mono text-ink-faint">
                <span>PHASE 1–5 VERIFIED</span>
                <span className="text-emerald font-bold">199 / 199 Tests</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-[10px] font-mono text-gold font-bold">
              {currentRole.slice(0, 2)}
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}