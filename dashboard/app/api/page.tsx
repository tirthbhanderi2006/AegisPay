"use client";

import React, { useState } from "react";
import {
  Terminal,
  Copy,
  Check,
  Shield,
  ArrowRight,
  ExternalLink,
  Code,
} from "lucide-react";
import { Card, Badge, Button, Tabs, type TabItem } from "@/components/ui";
import { MainLayout } from "@/components/layout";
import { JsonViewer } from "@/components/data-display/JsonViewer";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/risk/evaluate",
    title: "Synchronous Risk Evaluation",
    description: "Evaluates payment risk in sub-10ms using deterministic behavioral signals, entity network lookup, and frozen calibration.",
    headers: [
      { name: "X-API-Key", type: "string", required: true, desc: "Merchant secret key" },
      { name: "Idempotency-Key", type: "string", required: true, desc: "Unique idempotency token" },
    ],
    requestBody: {
      transaction_id: "txn_1001",
      merchant_id: "m_sandbox",
      amount: 830.0,
      currency: "USD",
      device_token: "dev_tok_iphone14_91A2",
      ip_token: "ip_tok_103_21_7F12",
      account_token: "acct_tok_usr_99812",
    },
    curl: `curl -X POST https://api.aegispay.com/v1/risk/evaluate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_live_••••••••••••••••3A9F" \\
  -H "Idempotency-Key: idem_txn_1001" \\
  -d '{
    "transaction_id": "txn_1001",
    "merchant_id": "m_sandbox",
    "amount": 830.00,
    "currency": "USD",
    "device_token": "dev_tok_iphone14_91A2",
    "ip_token": "ip_tok_103_21_7F12",
    "account_token": "acct_tok_usr_99812"
  }'`,
  },
  {
    method: "GET",
    path: "/v1/risk/transactions/{id}",
    title: "Get Transaction Evaluation",
    description: "Retrieves the immutable evaluation result, risk signals, and cryptographic SHA-256 audit record.",
    headers: [{ name: "X-API-Key", type: "string", required: true, desc: "Merchant secret key" }],
    curl: `curl -X GET https://api.aegispay.com/v1/risk/transactions/txn_1001 \\
  -H "X-API-Key: ak_live_••••••••••••••••3A9F"`,
  },
  {
    method: "POST",
    path: "/v1/risk/transactions/{id}/replay",
    title: "Deterministic Historical Replay",
    description: "Re-evaluates a historical transaction against the exact historical calibration snapshot (T <= as_of), proving score delta = 0.00.",
    headers: [{ name: "X-API-Key", type: "string", required: true, desc: "Merchant secret key" }],
    curl: `curl -X POST https://api.aegispay.com/v1/risk/transactions/txn_1001/replay \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_live_••••••••••••••••3A9F" \\
  -d '{
    "as_of": "2026-08-29T14:31:02Z"
  }'`,
  },
  {
    method: "POST",
    path: "/v1/events",
    title: "Ingest Payment Lifecycle Event",
    description: "Ingests asynchronous checkout events (created, authorized, failed, refunded) with strict idempotency deduplication.",
    headers: [{ name: "X-API-Key", type: "string", required: true, desc: "Merchant secret key" }],
    curl: `curl -X POST https://api.aegispay.com/v1/events \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_live_••••••••••••••••3A9F" \\
  -d '{
    "event_id": "evt_txn1001_auth",
    "transaction_id": "txn_1001",
    "event_type": "transaction.authorized",
    "timestamp": "2026-08-29T14:31:05Z",
    "payload": { "auth_code": "AUTH_992182" }
  }'`,
  },
  {
    method: "POST",
    path: "/v1/sandbox/transactions",
    title: "Execute Sandbox Attack Scenario",
    description: "Executes simulated attack scenarios through the complete 12-stage backend pipeline in test environment.",
    headers: [{ name: "X-API-Key", type: "string", required: true, desc: "Merchant secret key" }],
    curl: `curl -X POST https://api.aegispay.com/v1/sandbox/transactions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_test_••••••••••••••••" \\
  -d '{
    "scenario": "velocity"
  }'`,
  },
];

export default function ApiReferencePage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const activeEndpoint = ENDPOINTS[selectedIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeEndpoint.curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <MainLayout>
      <div className="space-y-6 select-text">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-ink-muted">
              <span>DEVELOPER</span>
              <span>/</span>
              <span className="font-bold text-ink">PUBLIC V1 API</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              Public V1 API Reference & Integration
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-line bg-surface hover:bg-surface-subtle text-xs font-sans font-medium text-ink transition-colors"
            >
              <span>Interactive FastAPI Swagger Docs</span>
              <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
            </a>
          </div>
        </div>

        {/* Layout */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Endpoint Selector (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-2">
            <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
              V1 Core Endpoints
            </span>
            {ENDPOINTS.map((ep, i) => {
              const isSelected = selectedIdx === i;
              return (
                <button
                  key={ep.path + ep.method}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    isSelected
                      ? "bg-surface border-ink shadow-card"
                      : "bg-surface/60 border-line hover:border-line-strong hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        ep.method === "POST" ? "bg-accent text-white" : "bg-emerald text-white"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink truncate">{ep.path}</span>
                  </div>
                  <p className="text-xs text-ink-secondary truncate">{ep.title}</p>
                </button>
              );
            })}
          </div>

          {/* Endpoint Documentation & Code (Right 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <Card variant="flat" padding="lg" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="accent" size="sm">{activeEndpoint.method}</Badge>
                    <span className="font-mono text-sm font-bold text-ink">{activeEndpoint.path}</span>
                  </div>
                  <h3 className="text-base font-bold text-ink mt-1">{activeEndpoint.title}</h3>
                </div>
              </div>

              <p className="text-xs text-ink-secondary leading-relaxed">
                {activeEndpoint.description}
              </p>

              {/* Headers Table */}
              <div className="space-y-2 pt-2">
                <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                  Required HTTP Headers
                </span>
                <div className="p-3 bg-surface-subtle rounded border border-line space-y-1 text-xs font-mono">
                  {activeEndpoint.headers.map((h) => (
                    <div key={h.name} className="flex justify-between py-0.5">
                      <span className="font-semibold text-ink">{h.name}</span>
                      <span className="text-ink-secondary">{h.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* cURL Code Snippet */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                    cURL Request Example
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    leftIcon={copiedCurl ? <Check className="w-3 h-3 text-emerald" /> : <Copy className="w-3 h-3" />}
                    className="h-6 text-xs px-2"
                  >
                    {copiedCurl ? "Copied" : "Copy cURL"}
                  </Button>
                </div>
                <div className="p-3 bg-surface-subtle rounded border border-line overflow-x-auto text-[11px] font-mono text-ink leading-relaxed">
                  <pre className="whitespace-pre">{activeEndpoint.curl}</pre>
                </div>
              </div>

              {/* Request JSON */}
              {activeEndpoint.requestBody && (
                <div className="space-y-2 pt-2">
                  <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                    Request JSON Schema
                  </span>
                  <JsonViewer data={activeEndpoint.requestBody} title="Request Schema Payload" maxHeight="200px" />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}