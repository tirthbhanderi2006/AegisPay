"use client";

import React, { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui";

export interface JsonViewerProps {
  data: any;
  title?: string;
  maxHeight?: string;
  initialCollapsed?: boolean;
  className?: string;
}

export function JsonViewer({
  data,
  title = "JSON Payload",
  maxHeight = "350px",
  initialCollapsed = false,
  className = "",
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const jsonString = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-lg border border-line bg-surface overflow-hidden text-xs font-mono select-text ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-surface-subtle border-b border-line">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-ink font-semibold hover:text-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <Terminal className="w-3.5 h-3.5 text-ink-muted" />
          <span className="text-xs uppercase tracking-wider">{title}</span>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          className="h-7 text-xs px-2"
        >
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>

      {/* Code Body */}
      {!collapsed && (
        <div
          className="p-3.5 overflow-auto bg-surface-subtle/50 text-ink leading-relaxed"
          style={{ maxHeight }}
        >
          <pre className="text-[11px] font-mono whitespace-pre">{jsonString}</pre>
        </div>
      )}
    </div>
  );
}
