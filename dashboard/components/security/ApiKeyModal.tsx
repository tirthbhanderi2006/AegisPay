"use client";

import React, { useState } from "react";
import { Copy, Check, AlertTriangle, Key, ShieldCheck } from "lucide-react";
import { Modal, Button, Badge } from "@/components/ui";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyName: string;
  secretPlaintext: string;
  environment: string;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  apiKeyName,
  secretPlaintext,
  environment,
}: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secretPlaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleDone = () => {
    if (!confirmedSaved) {
      alert("Please check the box confirming you have securely saved your API key.");
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (confirmedSaved) onClose();
      }}
      title="API Key Created Successfully"
      size="lg"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-gold/10 border border-gold/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-ink">Save this secret key immediately</h4>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              For security compliance, this is the <strong>only time</strong> your secret key will be displayed in plaintext.
              AegisPay stores only a non-reversible SHA-256 hash. If you lose this key, you will have to generate a new one.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-muted font-medium">Key Name: <span className="text-ink font-semibold">{apiKeyName}</span></span>
            <Badge variant={environment === "production" ? "danger" : "info"} size="sm">
              {environment.toUpperCase()}
            </Badge>
          </div>

          <div className="relative flex items-center bg-surface-overlay rounded-lg border border-line p-3 font-mono text-sm">
            <input
              type="text"
              readOnly
              value={secretPlaintext}
              className="bg-transparent border-none w-full text-gold font-mono focus:outline-none select-all"
            />
            <Button
              variant="outline"
              size="sm"
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopy}
              className="ml-2 flex-shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="pt-3 border-t border-line flex items-center gap-3">
          <input
            id="confirm-saved"
            type="checkbox"
            checked={confirmedSaved}
            onChange={(e) => setConfirmedSaved(e.target.checked)}
            className="w-4 h-4 rounded border-line bg-surface-overlay text-gold focus:ring-gold"
          />
          <label htmlFor="confirm-saved" className="text-xs text-ink select-none cursor-pointer">
            I have copied and securely stored this API secret in a password manager or secrets vault.
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handleDone}
            disabled={!confirmedSaved}
            className="w-full sm:w-auto"
          >
            I Have Saved My Key
          </Button>
        </div>
      </div>
    </Modal>
  );
}
