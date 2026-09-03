"use client";

import React, { useState } from "react";
import { Copy, Check, Lock, Smartphone, Globe, User, CreditCard } from "lucide-react";

export interface PrivacyTokenProps {
  token: string;
  type?: "device" | "ip" | "account" | "card" | "generic";
  label?: string;
  className?: string;
}

export function PrivacyToken({
  token,
  type = "generic",
  label,
  className = "",
}: PrivacyTokenProps) {
  const [copied, setCopied] = useState(false);

  // Mask token strictly eliminating raw PII
  const getMasked = (val: string) => {
    if (!val) return "••••••••";
    if (val.includes("••••")) return val;
    const parts = val.split("_");
    const prefix = parts.length > 1 ? parts.slice(0, -1).join("_") + "_" : "";
    const core = parts[parts.length - 1] || "";
    const suffix = core.slice(-4).toUpperCase();
    return `${prefix}••••${suffix}`;
  };

  const masked = getMasked(token);

  const getIcon = () => {
    switch (type) {
      case "device":
        return <Smartphone className="w-3.5 h-3.5 text-ink-muted" />;
      case "ip":
        return <Globe className="w-3.5 h-3.5 text-ink-muted" />;
      case "account":
        return <User className="w-3.5 h-3.5 text-ink-muted" />;
      case "card":
        return <CreditCard className="w-3.5 h-3.5 text-ink-muted" />;
      default:
        return <Lock className="w-3.5 h-3.5 text-ink-muted" />;
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(masked);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border border-line bg-surface font-mono text-xs text-ink transition-colors hover:border-line-strong select-text ${className}`}
      title={`Privacy-Safe Masked Token (${type})`}
    >
      {getIcon()}
      {label && <span className="text-ink-muted text-[10px] uppercase">{label}:</span>}
      <span className="font-semibold text-ink select-all">{masked}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="ml-1 p-0.5 rounded text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
        aria-label="Copy masked token"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
