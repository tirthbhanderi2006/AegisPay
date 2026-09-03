"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Shield,
  Building,
  User,
  Key,
  Globe,
  SlidersHorizontal,
  Command,
  Presentation,
  Check,
} from "lucide-react";
import { Badge, Button, Modal } from "@/components/ui";
import { useRBAC } from "@/lib/rbac";
import type { UserRole } from "@/lib/types";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole, setRole, merchantId, setMerchantId, environment, setEnvironment } = useRBAC();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const formatBreadcrumb = () => {
    if (pathname === "/" || pathname === "/landing") return "Landing";
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ");
  };

  const navItems = [
    { title: "Risk Operations Control Plane", route: "/dashboard" },
    { title: "Transaction Ledger & Evaluations", route: "/transactions" },
    { title: "Cross-Merchant Entity Intelligence", route: "/entities" },
    { title: "Interactive Scenario Sandbox", route: "/sandbox" },
    { title: "Webhook Operations & HMAC", route: "/webhooks" },
    { title: "Payment Lifecycle Ingestion Events", route: "/events" },
    { title: "Access Control & Security Matrix", route: "/security" },
    { title: "Public V1 Developer API", route: "/api" },
    { title: "System Health & Observability", route: "/system" },
    { title: "Platform Configuration & Secrets", route: "/settings" },
  ];

  const filteredNav = navItems.filter((i) =>
    i.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-30 h-14 bg-surface hairline-b flex items-center justify-between px-4 sm:px-6 select-none">
      {/* Left Breadcrumb & Context */}
      <div className="flex items-center gap-3 text-xs">
        <span className="font-mono text-ink-muted text-[11px] uppercase tracking-wider">
          AegisPay
        </span>
        <span className="text-line-strong">/</span>
        <span className="font-sans font-semibold text-ink">{formatBreadcrumb()}</span>
      </div>

      {/* Center ⌘K Global Search Trigger */}
      <button
        type="button"
        onClick={() => setShowSearch(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded border border-line bg-surface-subtle hover:bg-surface-muted text-ink-muted hover:text-ink transition-colors text-xs"
        aria-label="Global search"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="font-sans">Search routes, transactions, rules...</span>
        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-line ml-2">
          ⌘K
        </kbd>
      </button>

      {/* Right Controls & Switchers */}
      <div className="flex items-center gap-2.5 text-xs">
        {/* Environment Switcher */}
        <div className="flex items-center bg-surface-subtle rounded border border-line p-0.5">
          <button
            onClick={() => setEnvironment("SANDBOX")}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
              environment === "SANDBOX"
                ? "bg-surface text-ink shadow-subtle border border-line"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            SANDBOX
          </button>
          <button
            onClick={() => setEnvironment("PRODUCTION")}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
              environment === "PRODUCTION"
                ? "bg-accent text-white shadow-subtle"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            PROD
          </button>
        </div>

        {/* Merchant Boundary Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-surface rounded border border-line font-mono text-[11px]">
          <Building className="w-3 h-3 text-ink-muted" />
          <select
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            className="bg-transparent text-ink font-semibold focus:outline-none cursor-pointer"
          >
            <option value="m_sandbox">m_sandbox</option>
            <option value="m_acme">m_acme</option>
            <option value="m_alpha">m_alpha</option>
          </select>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-surface rounded border border-line font-mono text-[11px]">
          <User className="w-3 h-3 text-ink-muted" />
          <select
            value={currentRole}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="bg-transparent text-ink font-bold focus:outline-none cursor-pointer"
          >
            <option value="OWNER">OWNER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="RISK_ANALYST">RISK ANALYST</option>
            <option value="DEVELOPER">DEVELOPER</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>
      </div>

      {/* ⌘K Global Search Dialog */}
      <Modal isOpen={showSearch} onClose={() => setShowSearch(false)} size="md">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              autoFocus
              type="text"
              placeholder="Type a route, transaction ID (txn_001), or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs bg-surface border border-line rounded focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-sans text-ink"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-line/40">
            {filteredNav.map((item) => (
              <button
                key={item.route}
                onClick={() => {
                  router.push(item.route);
                  setShowSearch(false);
                }}
                className="w-full text-left p-2 hover:bg-surface-subtle rounded transition-colors flex items-center justify-between text-xs"
              >
                <span className="font-sans text-ink font-medium">{item.title}</span>
                <span className="font-mono text-[10px] text-ink-muted">{item.route}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </header>
  );
}