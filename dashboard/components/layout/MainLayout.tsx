"use client";

import React, { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-ink flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 min-w-0 p-4 lg:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}