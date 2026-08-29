"use client";

import React, { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";

interface JsonViewerProps {
  data: any;
  title?: string;
  defaultExpanded?: boolean;
  maxHeight?: string;
}

export function JsonViewer({
  data,
  title = "Raw JSON Response",
  defaultExpanded = true,
  maxHeight = "400px",
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface-overlay/80 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-line">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-semibold text-ink hover:text-gold transition-colors text-xs"
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>{title}</span>
        </button>

        <Button
          variant="ghost"
          size="sm"
          leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          onClick={handleCopy}
          className="text-xs h-7 px-2"
        >
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>

      {expanded && (
        <pre
          className="p-4 overflow-auto text-ink-muted leading-relaxed select-all"
          style={{ maxHeight }}
        >
          <code>{jsonString}</code>
        </pre>
      )}
    </div>
  );
}
