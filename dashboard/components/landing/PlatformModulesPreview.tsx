"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CreditCard,
  Search,
  GitBranch,
  RotateCcw,
  FlaskConical,
  Webhook,
  Layers,
  Shield,
  Code,
  Activity,
  Settings,
  ArrowRight,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface ModuleCard {
  id: string;
  name: string;
  category: "OPERATIONS" | "INTELLIGENCE" | "SECURITY" | "DEVELOPER";
  route: string;
  description: string;
  features: string[];
  metric: string;
  icon: React.ElementType;
}

const MODULES: ModuleCard[] = [
  {
    id: "dashboard",
    name: "Risk Operations Control Plane",
    category: "OPERATIONS",
    route: "/dashboard",
    description: "Real-time decision telemetry, throughput volume, decision distributions, and live alert feeds.",
    features: ["Real-time decision throughput", "High-risk alerts queue", "Distribution charts"],
    metric: "4.96ms P95",
    icon: LayoutDashboard,
  },
  {
    id: "transactions",
    name: "High-Density Transaction Ledger",
    category: "OPERATIONS",
    route: "/transactions",
    description: "Sub-millisecond ledger indexing with multi-column filtering, decision badges, and evidence confidence.",
    features: ["Deterministic ledger indexing", "Multi-token search", "Live status filtering"],
    metric: "10,000+ txns",
    icon: CreditCard,
  },
  {
    id: "investigations",
    name: "Forensic Split-Pane Console",
    category: "INTELLIGENCE",
    route: "/investigations/txn_1001",
    description: "Deep forensic investigation suite correlating 27 behavioral signals, session timelines, and dispute overrides.",
    features: ["Signal weight decomposition", "Temporal session playback", "Forensic packet export"],
    metric: "27 signals",
    icon: Search,
  },
  {
    id: "entities",
    name: "Cross-Merchant Entity Graph",
    category: "INTELLIGENCE",
    route: "/entities",
    description: "2-hop BFS graph explorer mapping device clusters, proxy networks, and syndicated fraud rings.",
    features: ["Privacy token masking", "Multi-hop cluster detection", "Blast radius scoring"],
    metric: "2-Hop BFS",
    icon: GitBranch,
  },
  {
    id: "replay",
    name: "Deterministic Replay Engine",
    category: "SECURITY",
    route: "/replay/txn_1001",
    description: "Point-in-time state reconstruction guaranteeing Score Delta = 0.0000 across frozen model versions.",
    features: ["Historical state playback", "Delta = 0.0000 guarantee", "Audit snapshot proof"],
    metric: "Δ = 0.0000",
    icon: RotateCcw,
  },
  {
    id: "sandbox",
    name: "Scenario Simulation Laboratory",
    category: "DEVELOPER",
    route: "/sandbox",
    description: "Interactive synthetic dataset execution testing normal, velocity burst, and syndicate scenarios.",
    features: ["12-stage pipeline visualizer", "Synthetic vector generator", "Real backend execution"],
    metric: "12 stages",
    icon: FlaskConical,
  },
  {
    id: "webhooks",
    name: "Outbound HMAC Webhooks Ledger",
    category: "DEVELOPER",
    route: "/webhooks",
    description: "Signed event delivery with constant-time HMAC-SHA256 verification and 5-minute replay tolerance.",
    features: ["HMAC signature tester", "Retry exponential backoff", "Delivery audit logs"],
    metric: "300s window",
    icon: Webhook,
  },
  {
    id: "events",
    name: "Payment Lifecycle Event Stream",
    category: "OPERATIONS",
    route: "/events",
    description: "Real-time idempotent event stream capturing authorization, capture, dispute, and refund transitions.",
    features: ["Idempotency verification", "Event state transitions", "Audit chain links"],
    metric: "100% Idempotent",
    icon: Layers,
  },
  {
    id: "security",
    name: "Multi-Role RBAC Governance",
    category: "SECURITY",
    route: "/security",
    description: "Enterprise 5-role governance matrix ensuring merchant boundary isolation and permission enforcement.",
    features: ["5 active role contexts", "Cryptographic key control", "Audit ledger permissions"],
    metric: "5 Roles",
    icon: Shield,
  },
  {
    id: "api",
    name: "Public REST API Reference",
    category: "DEVELOPER",
    route: "/api",
    description: "Comprehensive developer documentation with copyable cURL, TypeScript, and Python SDK code samples.",
    features: ["Interactive endpoint docs", "Copyable cURL snippets", "Error code catalog"],
    metric: "Sub-10ms API",
    icon: Code,
  },
  {
    id: "system",
    name: "Subsystem Observability & Drift",
    category: "OPERATIONS",
    route: "/system",
    description: "Continuous PSI and Kolmogorov-Smirnov offline drift monitoring with database health metrics.",
    features: ["PSI drift monitoring", "Subsystem latency telemetry", "Postgres & Redis health"],
    metric: "PSI < 0.10",
    icon: Activity,
  },
  {
    id: "settings",
    name: "Merchant Settings & Secrets",
    category: "SECURITY",
    route: "/settings",
    description: "Single-reveal API secret generation, webhook signing endpoint configuration, and boundary controls.",
    features: ["Single-reveal secret keys", "Webhook endpoint manager", "Merchant boundary isolation"],
    metric: "SHA-256 Keys",
    icon: Settings,
  },
];

export function PlatformModulesPreview({ className = "" }: { className?: string }) {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const categories = ["ALL", "OPERATIONS", "INTELLIGENCE", "SECURITY", "DEVELOPER"];

  const filtered = activeCategory === "ALL"
    ? MODULES
    : MODULES.filter((m) => m.category === activeCategory);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="max-w-3xl space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs text-accent font-bold">
            <span>COMPLETE RISK OPERATIONS SUITE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
            12 Integrated Platform Modules
          </h2>
          <p className="text-base text-ink-secondary mt-1">
            A cohesive fintech risk intelligence control plane with zero disconnected screens.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-subtle rounded-lg border border-line">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                activeCategory === cat
                  ? "bg-surface text-ink font-bold shadow-subtle border border-line"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.id}
              href={mod.route}
              className="p-5 rounded-xl border border-line bg-surface hover:border-line-strong hover:shadow-card transition-all duration-200 group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-line flex items-center justify-center text-accent group-hover:text-ink group-hover:border-ink transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    {mod.metric}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-ink group-hover:text-accent transition-colors flex items-center gap-1.5">
                    <span>{mod.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{mod.description}</p>
                </div>
              </div>

              {/* Feature Tags */}
              <div className="pt-3 border-t border-line/60 flex flex-wrap gap-1.5 font-mono text-[10px] text-ink-muted">
                {mod.features.map((f, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-surface-subtle border border-line/60">
                    {f}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
