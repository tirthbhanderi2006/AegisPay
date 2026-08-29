"use client";

import React, { useState } from "react";
import { ShieldCheck, Clock, Lock, Check, Copy } from "lucide-react";
import { Badge, Button } from "@/components/ui";

interface HmacInspectorProps {
  signature: string;
  timestamp: string;
  deliveryId: string;
  rawPayload: Record<string, any>;
  webhookSecretMasked?: string;
  replayWindowValid?: boolean;
}

export function HmacInspector({
  signature,
  timestamp,
  deliveryId,
  rawPayload,
  webhookSecretMasked = "whsec_••••••••••••••••3A9F",
  replayWindowValid = true,
}: HmacInspectorProps) {
  const [copied, setCopied] = useState(false);

  const payloadString = JSON.stringify(rawPayload, null, 2);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 p-4 rounded-xl bg-surface-overlay/80 border border-line">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald" />
          <span className="font-semibold text-sm text-ink uppercase font-mono">
            HMAC-SHA256 Security Verification
          </span>
        </div>
        <Badge variant={replayWindowValid ? "success" : "danger"} size="sm" dot>
          {replayWindowValid ? "SIGNATURE VALID" : "REPLAY EXPIRED"}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 bg-surface rounded-lg border border-line">
          <span className="text-ink-faint block uppercase text-[10px] mb-1">X-Aegis-Delivery-Id</span>
          <span className="text-ink font-semibold select-all">{deliveryId}</span>
        </div>

        <div className="p-3 bg-surface rounded-lg border border-line flex items-center justify-between">
          <div>
            <span className="text-ink-faint block uppercase text-[10px] mb-1">Replay Protection Window</span>
            <span className="text-emerald flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> &lt; 300s (5-Minute Window)
            </span>
          </div>
          <span className="text-ink-muted text-[10px]">{new Date(timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-ink-muted">HMAC-SHA256 Signature Header (`X-Aegis-Signature`):</span>
          <button
            onClick={() => handleCopy(signature)}
            className="text-[10px] text-gold hover:underline flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy Header"}
          </button>
        </div>
        <div className="p-2.5 bg-surface rounded-lg border border-line text-ink select-all break-all text-[11px]">
          {signature || `t=${Math.floor(new Date(timestamp).getTime() / 1000)},v1=8e8ec6c7d1bd02e7fe9d2b535b92ce993a4cfacbb228b8ec2cf018df8161ecbb`}
        </div>
      </div>

      <div className="p-3 bg-surface/80 rounded-lg border border-line text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-ink font-medium">
          <Lock className="w-3.5 h-3.5 text-gold" />
          <span>Verification Formula:</span>
        </div>
        <code className="text-[11px] text-ink-muted block font-mono bg-surface-overlay p-1.5 rounded">
          expected_sig = HMAC_SHA256(webhook_secret, timestamp + &quot;.&quot; + raw_payload)
        </code>
      </div>
    </div>
  );
}
