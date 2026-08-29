"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  Code,
  Copy,
  Check,
  Shield,
  Key,
  Globe,
  Clock,
  AlertCircle,
  Info,
  Terminal,
  FileText,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
} from "lucide-react";
import { Card, Badge, Button, Tabs, Modal, Input } from "@/components/ui";
import { MainLayout } from "@/components/layout";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/risk/evaluate",
    description: "Evaluate real-time transaction risk",
    auth: true,
    idempotent: true,
    rateLimited: true,
  },
  {
    method: "GET",
    path: "/v1/risk/transactions/{id}",
    description: "Retrieve full risk decision details",
    auth: true,
    idempotent: false,
    rateLimited: true,
  },
  {
    method: "GET",
    path: "/v1/risk/transactions/{id}/entities",
    description: "Retrieve privacy-safe entity network context",
    auth: true,
    idempotent: false,
    rateLimited: true,
  },
  {
    method: "GET",
    path: "/v1/risk/transactions/{id}/timeline",
    description: "Retrieve chronological event timeline",
    auth: true,
    idempotent: false,
    rateLimited: true,
  },
  {
    method: "POST",
    path: "/v1/risk/transactions/{id}/replay",
    description: "Replay historical risk decision",
    auth: true,
    idempotent: false,
    rateLimited: true,
  },
  {
    method: "POST",
    path: "/v1/events",
    description: "Ingest merchant payment lifecycle events",
    auth: true,
    idempotent: true,
    rateLimited: true,
  },
  {
    method: "POST",
    path: "/v1/sandbox/transactions",
    description: "Execute sandbox evaluation with synthetic scenario",
    auth: true,
    idempotent: false,
    rateLimited: true,
  },
];

const REQUEST_EXAMPLE = `curl -X POST https://api.aegispay.com/v1/risk/evaluate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ak_live_..." \\
  -H "Idempotency-Key: idem_txn_1001" \\
  -d '{
    "transaction_id": "txn_1001",
    "merchant_id": "m_sandbox",
    "amount": 8300.00,
    "currency": "INR",
    "account_token": "acct_hash_9918",
    "device_token": "dev_hash_iphone14_ab71",
    "ip_token": "ip_hash_103_21_244_0",
    "payment_instrument_token": "pi_tok_visa_4111",
    "timestamp": "2026-08-27T10:00:00Z"
  }'`;

const RESPONSE_EXAMPLE = `{
  "transaction_id": "txn_1001",
  "decision_id": "dec_txn_1001_1787823879",
  "decision": "CHALLENGE",
  "risk_score": 0.5842,
  "risk_level": "MEDIUM",
  "evidence_quality": 0.85,
  "signals": [
    {
      "name": "payment_velocity",
      "severity": "HIGH",
      "value": 4,
      "contribution": 0.28,
      "description": "Rapid payment attempts within short interval"
    }
  ],
  "explanation": [
    "Moderate behavioral deviation observed. Step-up authentication required."
  ],
  "versions": {
    "calibration": "calibration-v1.0",
    "policy": "policy-v2.0",
    "graph_snapshot": "graph-live"
  },
  "audit": {
    "snapshot_id": "snap_txn_1001",
    "decision_hash": "a4f891b2c3d4e5f6...",
    "recorded": true
  },
  "calibration_version": "calibration-v1.0",
  "request_id": "req_8819ab01",
  "latency_ms": 3.92
}`;

export default function ApiPage() {
  const [activeTab, setActiveTab] = useState("endpoints");
  const [copied, setCopied] = useState<string | null>(null);

  const tabs = [
    { value: "endpoints", label: "Endpoints", icon: <Terminal className="w-4 h-4" /> },
    { value: "auth", label: "Authentication", icon: <Shield className="w-4 h-4" /> },
    { value: "examples", label: "Code Examples", icon: <Code className="w-4 h-4" /> },
    { value: "errors", label: "Error Codes", icon: <AlertCircle className="w-4 h-4" /> },
    { value: "webhooks", label: "Webhook Verification", icon: <Globe className="w-4 h-4" /> },
  ];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <MainLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-ink">API Developer Portal</h1>
            <p className="text-ink-muted mt-1">Public V1 API reference — deterministic risk evaluation for production integration</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="gold" size="md" dot>V1 STABLE</Badge>
            <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-4 h-4" />}>OpenAPI Spec</Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} variant="pills" fullWidth>
            {activeTab === "endpoints" && <EndpointsTab onCopy={copyToClipboard} copied={copied} />}
            {activeTab === "auth" && <AuthTab />}
            {activeTab === "examples" && <ExamplesTab onCopy={copyToClipboard} copied={copied} />}
            {activeTab === "errors" && <ErrorsTab />}
            {activeTab === "webhooks" && <WebhooksTab />}
          </Tabs>
        </motion.div>
      </div>
    </MainLayout>
  );
}

function EndpointsTab({ onCopy, copied }: { onCopy: (text: string, key: string) => void; copied: string | null }) {
  return (
    <div className="space-y-4">
      {ENDPOINTS.map((endpoint, i) => (
        <motion.div
          key={endpoint.path}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
        >
          <EndpointCard endpoint={endpoint} onCopy={onCopy} copied={copied} />
        </motion.div>
      ))}
    </div>
  );
}

function EndpointCard({ endpoint, onCopy, copied }: { endpoint: any; onCopy: (text: string, key: string) => void; copied: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const copyKey = endpoint.method + endpoint.path;

  return (
    <Card variant="raised" padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Badge variant={endpoint.method === "POST" ? "gold" : "info"} size="md">{endpoint.method}</Badge>
          <code className="font-mono text-lg text-ink">{endpoint.path}</code>
        </div>
        <div className="flex items-center gap-3">
          {endpoint.auth && <Badge variant="info" size="sm" dot><Key className="w-3 h-3" /> Auth Required</Badge>}
          {endpoint.idempotent && <Badge variant="success" size="sm" dot><Shield className="w-3 h-3" /> Idempotent</Badge>}
          {endpoint.rateLimited && <Badge variant="warning" size="sm" dot><Clock className="w-3 h-3" /> Rate Limited</Badge>}
        </div>
      </div>

      <p className="text-ink-muted mt-4">{endpoint.description}</p>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {expanded ? "Hide" : "Show"} Details
        </Button>
        <Button variant="ghost" size="sm" leftIcon={copied === copyKey ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />} onClick={() => onCopy(`curl -X ${endpoint.method} ...`, copyKey)}>
          {copied === copyKey ? "Copied!" : "Copy cURL"}
        </Button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <DetailSection title="Headers">
                <ul className="space-y-2 text-sm font-mono text-ink">
                  <li><span className="text-ink-muted">Content-Type:</span> application/json</li>
                  <li><span className="text-ink-muted">X-API-Key:</span> ak_live_...</li>
                  <li><span className="text-ink-muted">Idempotency-Key:</span> idem_...</li>
                  <li><span className="text-ink-muted">X-Request-ID:</span> auto-generated</li>
                </ul>
              </DetailSection>
              <DetailSection title="Rate Limits">
                <ul className="space-y-2 text-sm">
                  <li>Standard: 1,000 RPM per merchant</li>
                  <li>Burst: 2,000 RPM (10s window)</li>
                  <li>Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset</li>
                </ul>
              </DetailSection>
            </div>

            <DetailSection title="Request Schema">
              <pre className="bg-surface p-4 rounded-lg border border-line overflow-x-auto text-sm">
{`{
  "transaction_id": "string (required)",
  "merchant_id": "string (required)",
  "amount": "number (required, >= 0)",
  "currency": "string (ISO 4217, default: USD)",
  "account_token": "string (optional)",
  "device_token": "string (optional)",
  "ip_token": "string (optional)",
  "payment_instrument_token": "string (optional)",
  "timestamp": "ISO8601 (default: now)",
  "order_id": "string (optional)",
  "session_id": "string (optional)",
  "billing_country": "string (optional)",
  "shipping_country": "string (optional)",
  "payment_method_type": "string (optional)",
  "client_metadata": "object (optional)"
}`}
              </pre>
            </DetailSection>

            <DetailSection title="Response Fields">
              <ul className="space-y-1 text-sm">
                <li><code className="font-mono">transaction_id</code> — Echo of request</li>
                <li><code className="font-mono">decision_id</code> — Unique decision identifier</li>
                <li><code className="font-mono">decision</code> — ALLOW | CHALLENGE | BLOCK | MANUAL_HOLD</li>
                <li><code className="font-mono">risk_score</code> — 0.00–100.00</li>
                <li><code className="font-mono">risk_level</code> — LOW | MEDIUM | HIGH</li>
                <li><code className="font-mono">evidence_quality</code> — 0.00–1.00</li>
                <li><code className="font-mono">signals[]</code> — Risk signals with contributions</li>
                <li><code className="font-mono">explanation[]</code> — Human-readable reasons</li>
                <li><code className="font-mono">versions</code> — Calibration, policy, graph</li>
                <li><code className="font-mono">audit</code> — Snapshot ID, hash, recorded flag</li>
                <li><code className="font-mono">latency_ms</code> — Processing time</li>
                <li><code className="font-mono">degradation_notice</code> — Optional dependency status</li>
              </ul>
            </DetailSection>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface p-4 rounded-lg border border-line">
      <h4 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  );
}

function AuthTab() {
  return (
    <div className="space-y-6">
      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">API KEY AUTHENTICATION</h3>
        <p className="text-ink-muted mb-6">All API requests require authentication via API key. Keys are hashed with SHA-256 before storage — never stored in plaintext.</p>

        <div className="space-y-4">
          <AuthMethod title="X-API-Key Header (Recommended)" code="X-API-Key: ak_live_..." description="Primary authentication method. Include your API key in the X-API-Key header." />
          <AuthMethod title="Authorization: Bearer" code="Authorization: Bearer ak_live_..." description="Alternative method using standard Bearer token format." />
          <AuthMethod title="Authorization: ApiKey" code="Authorization: ApiKey ak_live_..." description="Legacy format supported for compatibility." />
        </div>

        <div className="mt-6 p-4 bg-surface-overlay/50 rounded-lg border border-line">
          <h4 className="font-semibold text-ink mb-3">Key Formats</h4>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><code className="font-mono">ak_live_...</code> — Production keys (prefix: ak_live_)</li>
            <li><code className="font-mono">ak_test_...</code> — Sandbox/test keys (prefix: ak_test_)</li>
          </ul>
        </div>
      </Card>

      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">IDEMPOTENCY</h3>
        <p className="text-ink-muted mb-4">Use the <code className="font-mono">Idempotency-Key</code> header to safely retry requests without duplicate processing.</p>

        <div className="space-y-4">
          <div className="p-4 bg-surface-overlay/50 rounded-lg border border-line">
            <h4 className="font-semibold text-ink mb-2">Header</h4>
            <code className="font-mono text-sm">Idempotency-Key: idem_txn_1001</code>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald/5 border border-emerald/20 rounded-lg">
              <h4 className="font-semibold text-emerald mb-2">Identical Payload</h4>
              <p className="text-sm text-ink-muted">Returns cached response (200 OK). No re-evaluation.</p>
            </div>
            <div className="p-4 bg-red/5 border border-red/20 rounded-lg">
              <h4 className="font-semibold text-red mb-2">Payload Mismatch</h4>
              <p className="text-sm text-ink-muted">Returns HTTP 409 IDEMPOTENCY_CONFLICT. Prevents accidental overwrites.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-surface-overlay/50 rounded-lg border border-line">
          <h4 className="font-semibold text-ink mb-3">Cache TTL</h4>
          <p className="text-sm text-ink-muted">Idempotency keys are cached for 24 hours. Keys are scoped per merchant — same key can be reused across different merchants.</p>
        </div>
      </Card>

      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">RATE LIMITING</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <RateLimitCard label="Standard Tier" limit="1,000 RPM" burst="2,000 RPM" window="10s" />
          <RateLimitCard label="High Volume" limit="10,000 RPM" burst="20,000 RPM" window="10s" />
          <RateLimitCard label="Enterprise" limit="Custom" burst="Custom" window="Custom" />
        </div>

        <div className="p-4 bg-surface-overlay/50 rounded-lg border border-line">
          <h4 className="font-semibold text-ink mb-3">Rate Limit Headers</h4>
          <ul className="space-y-1 text-sm font-mono text-ink">
            <li>X-RateLimit-Limit: 1000</li>
            <li>X-RateLimit-Remaining: 999</li>
            <li>X-RateLimit-Reset: 1693315200</li>
            <li>Retry-After: 1 (on 429)</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

function AuthMethod({ title, code, description }: { title: string; code: string; description: string }) {
  return (
    <div className="p-4 bg-surface-overlay/50 rounded-lg border border-line">
      <h4 className="font-semibold text-ink mb-2">{title}</h4>
      <code className="font-mono text-sm block mb-2">{code}</code>
      <p className="text-sm text-ink-muted">{description}</p>
    </div>
  );
}

function RateLimitCard({ label, limit, burst, window }: { label: string; limit: string; burst: string; window: string }) {
  return (
    <Card variant="outlined" padding="md" className="text-center">
      <h4 className="font-semibold text-ink mb-2">{label}</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-ink-muted">Limit</span><span className="font-mono text-ink">{limit}</span></div>
        <div className="flex justify-between"><span className="text-ink-muted">Burst</span><span className="font-mono text-ink">{burst}</span></div>
        <div className="flex justify-between"><span className="text-ink-muted">Window</span><span className="font-mono text-ink">{window}</span></div>
      </div>
    </Card>
  );
}

function ExamplesTab({ onCopy, copied }: { onCopy: (text: string, key: string) => void; copied: string | null }) {
  return (
    <div className="space-y-6">
      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">RISK EVALUATION REQUEST</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">cURL</span>
          <Button variant="ghost" size="sm" leftIcon={copied === "request" ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />} onClick={() => onCopy(REQUEST_EXAMPLE, "request")}>
            {copied === "request" ? "Copied!" : "Copy"}
          </Button>
        </div>
        <pre className="bg-surface p-4 rounded-lg border border-line overflow-x-auto text-sm"><code>{REQUEST_EXAMPLE}</code></pre>
      </Card>

      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">SUCCESS RESPONSE (CHALLENGE)</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-ink-muted">JSON</span>
          <Button variant="ghost" size="sm" leftIcon={copied === "response" ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />} onClick={() => onCopy(RESPONSE_EXAMPLE, "response")}>
            {copied === "response" ? "Copied!" : "Copy"}
          </Button>
        </div>
        <pre className="bg-surface p-4 rounded-lg border border-line overflow-x-auto text-sm"><code>{RESPONSE_EXAMPLE}</code></pre>
      </Card>

      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">ERROR RESPONSES</h3>
        <div className="space-y-4">
          {[
            { code: 401, error: "UNAUTHORIZED", message: "Missing or invalid API key" },
            { code: 403, error: "FORBIDDEN", message: "Merchant access boundary enforced" },
            { code: 404, error: "NOT_FOUND", message: "Transaction not found" },
            { code: 409, error: "IDEMPOTENCY_CONFLICT", message: "Idempotency key payload mismatch" },
            { code: 422, error: "VALIDATION_ERROR", message: "Raw PAN/CVV detected in request" },
            { code: 429, error: "RATE_LIMITED", message: "Rate limit exceeded (1000 RPM)" },
            { code: 500, error: "INTERNAL_ERROR", message: "Internal server error" },
            { code: 503, error: "DEPENDENCY_UNAVAILABLE", message: "Entity graph temporarily degraded" },
          ].map((err) => (
            <div key={err.code} className="p-4 bg-surface-overlay/50 rounded-lg border border-line">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{err.error}</span>
                <Badge variant="danger" size="sm">HTTP {err.code}</Badge>
              </div>
              <p className="text-sm text-ink-muted mt-1">{err.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ErrorsTab() {
  return (
    <div className="space-y-4">
      {[
        { code: 401, name: "UNAUTHORIZED", description: "Missing or invalid API key. Provide X-API-Key header or Authorization: Bearer <key>.", retryable: false },
        { code: 403, name: "FORBIDDEN", description: "Authenticated merchant not authorized for target merchant_id. Cross-merchant access blocked.", retryable: false },
        { code: 404, name: "NOT_FOUND", description: "Transaction not found in risk audit records.", retryable: false },
        { code: 409, name: "IDEMPOTENCY_CONFLICT", description: "Idempotency-Key provided but payload differs from cached request.", retryable: false },
        { code: 422, name: "VALIDATION_ERROR", description: "Request validation failed. Common: raw PAN/CVV detected in token fields.", retryable: false },
        { code: 429, name: "RATE_LIMITED", description: "Rate limit exceeded. Check X-RateLimit-* headers and Retry-After.", retryable: true },
        { code: 500, name: "INTERNAL_ERROR", description: "Internal server error. Request ID logged for debugging.", retryable: true },
        { code: 503, name: "DEPENDENCY_UNAVAILABLE", description: "Dependency degraded (entity graph, FX, audit). Degradation notice in response.", retryable: true },
      ].map((err) => (
        <Card key={err.code} variant="raised" padding="md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="danger" size="md">HTTP {err.code}</Badge>
                <span className="font-semibold text-ink">{err.name}</span>
              </div>
              <p className="text-sm text-ink-muted">{err.description}</p>
            </div>
            <Badge variant={err.retryable ? "success" : "neutral"} size="sm" dot>
              {err.retryable ? "RETRYABLE" : "NON-RETRYABLE"}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function WebhooksTab() {
  return (
    <div className="space-y-6">
      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">SUPPORTED EVENTS</h3>
        <div className="space-y-3">
          {[
            { event: "risk.decision.created", description: "Fired when a new risk decision is created" },
            { event: "risk.decision.updated", description: "Fired when a decision is updated (e.g., manual review)" },
            { event: "risk.manual_review.required", description: "Fired when a decision requires manual review" },
          ].map((e) => (
            <div key={e.event} className="p-4 bg-surface-overlay/50 rounded-lg border border-line">
              <code className="font-mono text-ink">{e.event}</code>
              <p className="text-sm text-ink-muted mt-1">{e.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">WEBHOOK PAYLOAD STRUCTURE</h3>
        <pre className="bg-surface p-4 rounded-lg border border-line overflow-x-auto text-sm">
{`{
  "event": "risk.decision.created",
  "event_id": "wevt_txn_1001",
  "transaction_id": "txn_1001",
  "merchant_id": "m_sandbox",
  "decision_id": "dec_txn_1001_1787823879",
  "decision": "CHALLENGE",
  "risk_score": 0.5842,
  "risk_level": "MEDIUM",
  "timestamp": "2026-08-27T10:00:00Z"
}`}
        </pre>
      </Card>

      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">SECURITY HEADERS</h3>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-4">
            <SecurityHeader name="X-Aegis-Signature" description="HMAC-SHA256 signature" format="sha256=..." required />
            <SecurityHeader name="X-Aegis-Timestamp" description="Unix timestamp" format="1693315200" required />
            <SecurityHeader name="X-Aegis-Delivery-Id" description="Unique delivery ID" format="del_abc12345" required />
          </div>
        </div>
      </Card>

      <Card variant="raised" padding="lg">
        <h3 className="text-lg font-semibold text-ink mb-4">VERIFICATION EXAMPLE</h3>
        <pre className="bg-surface p-4 rounded-lg border border-line overflow-x-auto text-sm">
{`# Python
import hmac, hashlib, time

def verify_webhook(payload: bytes, signature: str, timestamp: str, secret: str) -> bool:
    # Check replay window (5 minutes)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False
    
    # Verify HMAC-SHA256
    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{payload.decode()}".encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)`}
        </pre>
      </Card>
    </div>
  );
}

function SecurityHeader({ name, description, format, required }: { name: string; description: string; format: string; required: boolean }) {
  return (
    <div className="p-4 bg-surface-overlay/50 rounded-lg border border-line">
      <div className="flex items-center gap-2 mb-1">
        <code className="font-mono text-sm">{name}</code>
        {required && <Badge variant="danger" size="sm">REQUIRED</Badge>}
      </div>
      <p className="text-sm text-ink-muted">{description}</p>
      <code className="font-mono text-xs text-ink-muted">{format}</code>
    </div>
  );
}