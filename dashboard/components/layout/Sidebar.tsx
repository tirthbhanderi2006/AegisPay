"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  CreditCard,
  GitBranch,
  FlaskConical,
  MessageSquare,
  Activity,
  Key,
  Terminal,
  Cpu,
  Settings,
  Lock,
  Globe,
} from "lucide-react";
import { useRBAC } from "@/lib/rbac";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentRole, merchantId, environment } = useRBAC();

  const navigationGroups: NavGroup[] = [
    {
      group: "General",
      items: [
        { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { name: "Landing / Demo", href: "/landing", icon: <Globe className="w-4 h-4" /> },
      ],
    },
    {
      group: "Risk Operations",
      items: [
        { name: "Transactions", href: "/transactions", icon: <CreditCard className="w-4 h-4" /> },
        { name: "Entity Intelligence", href: "/entities", icon: <GitBranch className="w-4 h-4" /> },
        { name: "Scenario Sandbox", href: "/sandbox", icon: <FlaskConical className="w-4 h-4" /> },
      ],
    },
    {
      group: "Operations",
      items: [
        { name: "Webhooks", href: "/webhooks", icon: <MessageSquare className="w-4 h-4" /> },
        { name: "Lifecycle Events", href: "/events", icon: <Activity className="w-4 h-4" /> },
      ],
    },
    {
      group: "Security & Access",
      items: [
        { name: "Access Control", href: "/security", icon: <Lock className="w-4 h-4" /> },
      ],
    },
    {
      group: "Developer & System",
      items: [
        { name: "API Reference", href: "/api", icon: <Terminal className="w-4 h-4" /> },
        { name: "System Health", href: "/system", icon: <Cpu className="w-4 h-4" /> },
        { name: "Settings & Keys", href: "/settings", icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-surface hairline-r flex flex-col justify-between select-none h-screen sticky top-0 flex-shrink-0">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-5 flex items-center gap-2.5 hairline-b">
          <div className="w-6 h-6 rounded bg-ink flex items-center justify-center text-white font-bold text-xs">
            A
          </div>
          <div>
            <span className="font-sans font-bold text-sm text-ink tracking-tight">AEGISPAY</span>
            <span className="block font-mono text-[9px] text-ink-muted uppercase leading-none">
              RISK INFRASTRUCTURE
            </span>
          </div>
        </div>

        {/* Grouped Nav Items */}
        <div className="px-3 py-4 space-y-5 overflow-y-auto max-h-[calc(100vh-120px)]">
          {navigationGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <span className="px-2 font-mono text-[10px] font-semibold text-ink-faint uppercase tracking-wider block">
                {group.group}
              </span>
              <div className="space-y-0.5 pt-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-surface-muted text-ink font-semibold"
                          : "text-ink-secondary hover:text-ink hover:bg-surface-subtle"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? "text-accent" : "text-ink-muted"}>
                          {item.icon}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-surface-subtle text-ink-muted border border-line">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Tenant Footer */}
      <div className="p-3 hairline-t bg-surface-subtle/50 text-[11px] font-mono">
        <div className="flex items-center justify-between text-ink-secondary">
          <span className="truncate">{merchantId}</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface border border-line text-ink">
            {currentRole}
          </span>
        </div>
      </div>
    </aside>
  );
}