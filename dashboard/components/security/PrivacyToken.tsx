"use client";

import React, { useState } from "react";
import { Shield, Copy, Check } from "lucide-react";
import { clsx } from "clsx";

interface PrivacyTokenProps {
  token: string | null | undefined;
  type?: "device" | "ip" | "account" | "card" | "merchant" | "generic";
  label?: string;
}

export function PrivacyToken({ token, type = "generic", label }: PrivacyTokenProps) {
  const [copied, setCopied] = useState(false);

  if (!token) {
    return <span className="text-xs text-ink-faint font-mono">None</span>;
  }

  // Ensure raw PANs or full IPs are masked safely
  const formatToken = (val: string) => {
    if (val.startsWith("dev_") || val.startsWith("ip_") || val.startsWith("acct_") || val.startsWith("pi_")) {
      return val;
    }
    if (val.length > 8) {
      return `${val.slice(0, 4)}••••${val.slice(-4)}`;
    }
    return `••••${val.slice(-4)}`;
  };

  const displayVal = formatToken(token);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1.5 font-mono text-xs">
      {label && <span className="text-ink-muted text-[11px] font-sans mr-1">{label}:</span>}
      <span
        onClick={handleCopy}
        title="Privacy-safe synthetic token (Click to copy)"
        className={clsx(
          "px-2 py-0.5 rounded bg-surface-overlay text-ink border border-line cursor-pointer hover:border-gold/50 transition-colors inline-flex items-center gap-1.5 select-all font-medium"
        )}
      >
        <Shield className="w-3 h-3 text-gold flex-shrink-0" />
        {displayVal}
        {copied ? (
          <Check className="w-3 h-3 text-emerald ml-0.5" />
        ) : (
          <Copy className="w-3 h-3 text-ink-faint hover:text-ink ml-0.5" />
        )}
      </span>
    </div>
  );
}
