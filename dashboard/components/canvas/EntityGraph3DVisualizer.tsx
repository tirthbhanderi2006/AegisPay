"use client";

import React, { useRef, useEffect, useState } from "react";
import { PrivacyToken } from "@/components/security/PrivacyToken";
import { Badge, Button } from "@/components/ui";
import {
  Shield,
  GitBranch,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Lock,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  User,
  Smartphone,
  Globe,
  CreditCard,
  X,
} from "lucide-react";

interface GraphNode {
  id: string;
  type: "transaction" | "device" | "ip" | "account" | "card";
  label: string;
  maskedToken: string;
  riskScore: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  hop: number; // 0 = origin, 1 = 1-hop, 2 = 2-hop, 3 = 3-hop
  expanded?: boolean;
  linkedMerchants?: string[];
  lastSeen?: string;
  screenX?: number;
  screenY?: number;
  scale?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  label?: string;
}

/* Light + cobalt palette (mirrors globals.css design tokens) */
const C = {
  cobalt: "#0F52BA",
  slate: "#334155", // decision-hold — used for infrastructure (IP) nodes
  block: "#B91C1C",
  challenge: "#B45309",
  allow: "#15803D",
  faint: "#A3A39E",
};

const INITIAL_GRAPH_NODES: GraphNode[] = [
  // 0-Hop Root Transaction
  {
    id: "txn_root",
    type: "transaction",
    label: "Evaluated Transaction",
    maskedToken: "txn_live_001",
    riskScore: 0.914,
    x: 0,
    y: 0,
    z: 0,
    radius: 20,
    color: C.block,
    hop: 0,
    expanded: true,
    linkedMerchants: ["m_sandbox", "m_acme"],
    lastSeen: "Just now",
  },
  // 1-Hop Direct Tokens
  {
    id: "dev_91a2",
    type: "device",
    label: "Hardware Fingerprint",
    maskedToken: "dev_••••91A2",
    riskScore: 0.88,
    x: -170,
    y: -90,
    z: 40,
    radius: 14,
    color: C.cobalt,
    hop: 1,
    expanded: false,
    linkedMerchants: ["m_sandbox", "m_acme", "m_alpha", "m_retail"],
    lastSeen: "2 mins ago",
  },
  {
    id: "ip_7f12",
    type: "ip",
    label: "Carrier / VPN IP",
    maskedToken: "ip_••••7F12",
    riskScore: 0.76,
    x: 180,
    y: -80,
    z: -30,
    radius: 14,
    color: C.slate,
    hop: 1,
    expanded: false,
    linkedMerchants: ["m_sandbox", "m_global"],
    lastSeen: "4 mins ago",
  },
  {
    id: "acct_9812",
    type: "account",
    label: "Cardholder Account",
    maskedToken: "acct_••••9812",
    riskScore: 0.65,
    x: -120,
    y: 140,
    z: -20,
    radius: 14,
    color: C.allow,
    hop: 1,
    expanded: false,
    linkedMerchants: ["m_sandbox"],
    lastSeen: "10 mins ago",
  },
  {
    id: "card_4111",
    type: "card",
    label: "Payment Instrument",
    maskedToken: "pi_••••4111",
    riskScore: 0.82,
    x: 140,
    y: 120,
    z: 50,
    radius: 14,
    color: C.challenge,
    hop: 1,
    expanded: false,
    linkedMerchants: ["m_sandbox", "m_acme"],
    lastSeen: "1 min ago",
  },
  // 2-Hop Network Spread (Coordinated Syndication)
  {
    id: "dev_3b7f",
    type: "device",
    label: "Syndicate Clone Device",
    maskedToken: "dev_••••3B7F",
    riskScore: 0.94,
    x: -280,
    y: -160,
    z: 90,
    radius: 11,
    color: C.block,
    hop: 2,
    expanded: false,
    linkedMerchants: ["m_acme", "m_beta", "m_crypto"],
    lastSeen: "12 mins ago",
  },
  {
    id: "card_8821",
    type: "card",
    label: "Secondary Card Test",
    maskedToken: "pi_••••8821",
    riskScore: 0.89,
    x: -250,
    y: 30,
    z: 80,
    radius: 11,
    color: C.block,
    hop: 2,
    expanded: false,
    linkedMerchants: ["m_acme", "m_alpha"],
    lastSeen: "15 mins ago",
  },
  {
    id: "ip_1104",
    type: "ip",
    label: "Tor / Relay Proxy",
    maskedToken: "ip_••••1104",
    riskScore: 0.73,
    x: 290,
    y: -130,
    z: -70,
    radius: 11,
    color: C.slate,
    hop: 2,
    expanded: false,
    linkedMerchants: ["m_global", "m_asia"],
    lastSeen: "20 mins ago",
  },
  {
    id: "acct_0045",
    type: "account",
    label: "Mule Account Cluster",
    maskedToken: "acct_••••0045",
    riskScore: 0.86,
    x: 240,
    y: 190,
    z: 60,
    radius: 11,
    color: C.block,
    hop: 2,
    expanded: false,
    linkedMerchants: ["m_retail", "m_acme"],
    lastSeen: "25 mins ago",
  },
];

const INITIAL_GRAPH_EDGES: GraphEdge[] = [
  { from: "txn_root", to: "dev_91a2", weight: 1.0, label: "Session Device" },
  { from: "txn_root", to: "ip_7f12", weight: 1.0, label: "Session IP" },
  { from: "txn_root", to: "acct_9812", weight: 1.0, label: "Owner Account" },
  { from: "txn_root", to: "card_4111", weight: 1.0, label: "Primary Card" },
  { from: "dev_91a2", to: "dev_3b7f", weight: 0.5, label: "Shared Browser Fingerprint" },
  { from: "dev_91a2", to: "card_8821", weight: 0.5, label: "Card Injected" },
  { from: "ip_7f12", to: "ip_1104", weight: 0.5, label: "Subnet CIDR Link" },
  { from: "card_4111", to: "acct_0045", weight: 0.5, label: "Cross-Merchant Billing" },
  { from: "dev_3b7f", to: "card_8821", weight: 0.25 },
  { from: "ip_1104", to: "acct_0045", weight: 0.25 },
];

export function EntityGraph3DVisualizer({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>(INITIAL_GRAPH_NODES);
  const [edges, setEdges] = useState<GraphEdge[]>(INITIAL_GRAPH_EDGES);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: 0.28, y: 0.42 });
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchToken, setSearchToken] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const lastMousePos = useRef({ x: 0, y: 0 });

  // Screen-space projection of each node in CSS pixels, refreshed every
  // animation frame. The render loop applies full 3D rotation + perspective,
  // so hover/click must hit-test against these live coordinates — not a
  // separate flat approximation (which is what made targeting inaccurate).
  const projectedRef = useRef<Record<string, { x: number; y: number; r: number }>>({});

  // Mirror render-relevant state into a ref so the animation loop can read the
  // latest camera/filter values every frame without tearing down and
  // restarting on each hover (which reset the orbit + reseeded the pulses).
  const viewRef = useRef({ rotation, zoom, hoveredNode, selectedNode, searchToken, typeFilter });
  useEffect(() => {
    viewRef.current = { rotation, zoom, hoveredNode, selectedNode, searchToken, typeFilter };
  }, [rotation, zoom, hoveredNode, selectedNode, searchToken, typeFilter]);

  // Handle node expand/collapse to dynamically reveal 3-hop cluster
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);

    if (!node.expanded && node.hop === 2) {
      // Dynamically expand 3-hop leaf nodes
      const extraId = `sub_${node.id}_${Date.now().toString().slice(-3)}`;
      const newNode: GraphNode = {
        id: extraId,
        type: node.type === "device" ? "card" : "device",
        label: `3-Hop Cluster Leaf`,
        maskedToken: `${node.type === "device" ? "pi" : "dev"}_••••${Math.floor(1000 + Math.random() * 9000)}`,
        riskScore: Math.min(0.99, node.riskScore + 0.03),
        x: node.x * 1.35 + (Math.random() - 0.5) * 60,
        y: node.y * 1.35 + (Math.random() - 0.5) * 60,
        z: node.z * 1.35 + (Math.random() - 0.5) * 60,
        radius: 9,
        color: C.block,
        hop: 3,
        expanded: false,
        linkedMerchants: ["m_external_syndicate"],
        lastSeen: "Just now",
      };

      const newEdge: GraphEdge = {
        from: node.id,
        to: extraId,
        weight: 0.25,
        label: "3-Hop Expansion",
      };

      setNodes((prev) => [...prev.map((n) => (n.id === node.id ? { ...n, expanded: true } : n)), newNode]);
      setEdges((prev) => [...prev, newEdge]);
    } else {
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, expanded: !n.expanded } : n))
      );
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const dprOf = () => window.devicePixelRatio || 1;
    let width = (canvas.width = canvas.offsetWidth * dprOf());
    let height = (canvas.height = canvas.offsetHeight * dprOf());

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * dprOf();
      height = canvas.height = canvas.offsetHeight * dprOf();
    };

    window.addEventListener("resize", handleResize);
    // Re-measure on layout changes too (e.g. entering/exiting fullscreen),
    // which don't fire a window resize event.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleResize) : null;
    ro?.observe(canvas);

    // Data pulses traveling along the edges (BFS propagation packets)
    const particles = Array.from({ length: 18 }, () => ({
      edgeIdx: Math.floor(Math.random() * Math.max(1, edges.length)),
      t: Math.random(),
      speed: 0.005 + Math.random() * 0.008,
    }));

    let time = 0;

    const render = () => {
      const { rotation, zoom, hoveredNode, selectedNode, searchToken, typeFilter } = viewRef.current;
      time += 0.014;
      const dpr = dprOf();
      const cx = width / 2;
      const cy = height / 2;
      const fov = 420 * zoom;

      ctx.clearRect(0, 0, width, height);

      // ── Light canvas backdrop with a gentle vertical wash ──
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#FFFFFF");
      bg.addColorStop(1, "#F3F4F1");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Faint cobalt radial glow anchoring the graph core (depth cue)
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
      glow.addColorStop(0, "rgba(15, 82, 186, 0.07)");
      glow.addColorStop(0.55, "rgba(15, 82, 186, 0.02)");
      glow.addColorStop(1, "rgba(15, 82, 186, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Gentle auto-orbit layered over the user's drag rotation
      const rotY = rotation.y + Math.sin(time * 0.3) * 0.05;
      const rotX = rotation.x + Math.cos(time * 0.25) * 0.03;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Perspective offset pulls the whole scene back a touch so the graph
      // sits inside the viewport with margin for edge labels (no clipping).
      const project = (x: number, y: number, z: number) => {
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX + 440;
        const scale = fov / Math.max(z2, 10);
        return { sx: cx + x1 * scale * dpr, sy: cy + y1 * scale * dpr, scale };
      };

      // ── 3D radial grid rings (cobalt-tinted hairlines) ──
      [270, 170, 85].forEach((r, idx) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = idx === 0 ? "rgba(15, 82, 186, 0.12)" : "rgba(17, 17, 16, 0.05)";
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([2 * dpr, 9 * dpr]);
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const p = project(Math.cos(a) * r, 0, Math.sin(a) * r);
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
        ctx.restore();
      });

      // ── Project nodes and track depth extent for atmospheric fade ──
      const proj: Record<string, GraphNode & { sx: number; sy: number; scale: number }> = {};
      let minScale = Infinity;
      let maxScale = -Infinity;
      nodes.forEach((n) => {
        const p = project(n.x, n.y, n.z);
        proj[n.id] = { ...n, sx: p.sx, sy: p.sy, scale: p.scale };
        if (p.scale < minScale) minScale = p.scale;
        if (p.scale > maxScale) maxScale = p.scale;
      });
      // Nearer nodes (larger scale) render fully opaque; far nodes recede.
      const depthAlpha = (s: number) =>
        maxScale === minScale ? 1 : 0.5 + 0.5 * ((s - minScale) / (maxScale - minScale));

      // Publish CSS-pixel projection for accurate pointer hit-testing
      const hit: Record<string, { x: number; y: number; r: number }> = {};
      Object.values(proj).forEach((n) => {
        hit[n.id] = { x: n.sx / dpr, y: n.sy / dpr, r: n.radius * n.scale };
      });
      projectedRef.current = hit;

      // ── Edges: cobalt (direct) · red-dashed (cross-merchant) · faint (weak) ──
      edges.forEach((edge) => {
        const from = proj[edge.from];
        const to = proj[edge.to];
        if (!from || !to) return;

        if (typeFilter !== "all") {
          if (from.type !== typeFilter && from.hop !== 0 && to.type !== typeFilter && to.hop !== 0) return;
        }

        const a = Math.min(depthAlpha(from.scale), depthAlpha(to.scale));
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(from.sx, from.sy);
        ctx.lineTo(to.sx, to.sy);

        if (edge.weight === 1.0) {
          ctx.strokeStyle = `rgba(15, 82, 186, ${0.5 * a})`;
          ctx.lineWidth = 1.6 * dpr;
        } else if (edge.weight === 0.5) {
          ctx.strokeStyle = `rgba(185, 28, 28, ${0.45 * a})`;
          ctx.lineWidth = 1.3 * dpr;
          ctx.setLineDash([5 * dpr, 4 * dpr]);
        } else {
          ctx.strokeStyle = `rgba(17, 17, 16, ${0.14 * a})`;
          ctx.lineWidth = 1 * dpr;
          ctx.setLineDash([2 * dpr, 5 * dpr]);
        }
        ctx.stroke();
        ctx.restore();
      });

      // ── Animated propagation packets traveling along edges ──
      particles.forEach((p) => {
        p.t += p.speed;
        if (p.t > 1) {
          p.t = 0;
          p.edgeIdx = Math.floor(Math.random() * Math.max(1, edges.length));
        }

        const edge = edges[p.edgeIdx];
        if (!edge) return;
        const from = proj[edge.from];
        const to = proj[edge.to];
        if (!from || !to) return;

        const px = from.sx + (to.sx - from.sx) * p.t;
        const py = from.sy + (to.sy - from.sy) * p.t;

        ctx.save();
        ctx.fillStyle = edge.weight === 1.0 ? C.cobalt : edge.weight === 0.5 ? C.block : C.faint;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.3, 2 * from.scale) * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ── Nodes (painter's algorithm: far → near) ──
      const sorted = Object.values(proj).sort((a, b) => a.scale - b.scale);

      sorted.forEach((node) => {
        const isMatched = typeFilter === "all" || node.hop === 0 || node.type === typeFilter;
        const isSearched = !searchToken || node.maskedToken.toLowerCase().includes(searchToken.toLowerCase());
        const active = hoveredNode?.id === node.id || selectedNode?.id === node.id;
        const nodeSize = node.radius * node.scale * dpr;
        const dim = !(isMatched && isSearched);
        const alpha = dim ? 0.12 : depthAlpha(node.scale);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Root "sonar ping" — a slow expanding ring that anchors the eye
        if (node.hop === 0 && !dim) {
          const ping = (time % 2.2) / 2.2;
          ctx.globalAlpha = (1 - ping) * 0.5;
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, nodeSize + ping * 42 * dpr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = alpha;
        }

        // Hover / selected soft halo
        if (active) {
          ctx.globalAlpha = 0.14;
          ctx.fillStyle = node.color;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, nodeSize + 14 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = alpha;
        }

        // White disc with a soft drop shadow (premium on light)
        ctx.shadowColor = "rgba(17, 17, 16, 0.16)";
        ctx.shadowBlur = (active ? 16 : 9) * dpr;
        ctx.shadowOffsetY = 2 * dpr;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, nodeSize, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow before crisp strokes/fills
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Colored ring
        ctx.strokeStyle = node.color;
        ctx.lineWidth = (node.hop === 0 ? 3 : 2) * dpr;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, nodeSize, 0, Math.PI * 2);
        ctx.stroke();

        // Inner core dot — its size encodes the node's risk score
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, nodeSize * (0.32 + node.riskScore * 0.24), 0, Math.PI * 2);
        ctx.fill();

        // Labels: dark ink token + severity-colored risk (near / active only)
        if ((node.scale > 0.42 || active) && !dim) {
          ctx.globalAlpha = Math.min(1, alpha + 0.15);
          ctx.textAlign = "center";

          ctx.fillStyle = "#111110";
          ctx.font = `600 ${Math.max(9, 10 * node.scale) * dpr}px 'IBM Plex Mono', ui-monospace, monospace`;
          ctx.fillText(node.maskedToken, node.sx, node.sy + nodeSize + 15 * dpr);

          ctx.fillStyle = node.riskScore >= 0.7 ? C.block : node.riskScore >= 0.4 ? C.challenge : C.allow;
          ctx.font = `600 ${Math.max(7.5, 8.5 * node.scale) * dpr}px 'IBM Plex Mono', ui-monospace, monospace`;
          ctx.fillText(`${(node.riskScore * 100).toFixed(0)}% RISK`, node.sx, node.sy + nodeSize + 27 * dpr);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      ro?.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, edges]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      setRotation((prev) => ({
        x: Math.max(-0.85, Math.min(0.85, prev.x + deltaY * 0.006)),
        y: prev.y + deltaX * 0.008,
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Hit-test against the live 3D projection published by the render loop
    const found = nodes.find((n) => {
      const p = projectedRef.current[n.id];
      if (!p) return false;
      return Math.hypot(x - p.x, y - p.y) <= p.r + 7;
    });

    setHoveredNode(found || null);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (hoveredNode) {
      handleNodeClick(hoveredNode);
    }
  };

  return (
    <div
      className={`bg-surface rounded-xl border border-line shadow-card transition-all ${
        isFullscreen
          ? "fixed inset-4 z-50 flex flex-col bg-surface shadow-modal border-line-strong p-6"
          : `p-6 space-y-4 ${className}`
      }`}
    >
      {/* Top Header & Interactive Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-base text-ink">
              Cross-Merchant 3D Entity Network Architecture
            </h3>
            <Badge variant="danger" size="sm" dot>
              COORDINATED FRAUD CLUSTER DETECTED
            </Badge>
          </div>
          <p className="text-xs text-ink-secondary mt-1">
            Click any node to dynamically expand its cross-merchant linkage graph · Strict zero raw PII masking
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search token..."
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              className="h-8 pl-8 pr-2 text-xs bg-surface-subtle border border-line rounded font-mono text-ink focus:outline-none focus:border-accent w-32 sm:w-40"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2 bg-surface-subtle border border-line rounded text-xs font-sans text-ink focus:outline-none cursor-pointer"
          >
            <option value="all">All Tokens</option>
            <option value="device">Devices Only</option>
            <option value="ip">IP Tokens</option>
            <option value="card">Cards Only</option>
            <option value="account">Accounts</option>
          </select>

          {/* Zoom Controls */}
          <div className="flex items-center bg-surface-subtle p-0.5 rounded border border-line text-xs">
            <button
              onClick={() => setZoom(Math.max(0.6, zoom - 0.15))}
              className="p-1 text-ink-muted hover:text-ink rounded hover:bg-surface transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] px-1.5 font-bold text-ink">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(1.6, zoom + 0.15))}
              className="p-1 text-ink-muted hover:text-ink rounded hover:bg-surface transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset Orbit */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRotation({ x: 0.28, y: 0.42 });
              setZoom(1.0);
              setNodes(INITIAL_GRAPH_NODES);
              setEdges(INITIAL_GRAPH_EDGES);
              setSelectedNode(null);
            }}
            leftIcon={<RefreshCw className="w-3 h-3" />}
            className="h-8 text-xs px-2.5"
          >
            Reset
          </Button>

          {/* Fullscreen Expand Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            leftIcon={isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            className="h-8 text-xs px-2.5"
          >
            {isFullscreen ? "Exit Fullscreen" : "Expand Graph"}
          </Button>
        </div>
      </div>

      {/* 3D Viewport with Split Drawer */}
      <div className={`relative w-full ${isFullscreen ? "flex-1" : "h-[500px]"} rounded-xl bg-surface-subtle border border-line overflow-hidden flex`}>
        {/* Canvas Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoveredNode(null);
          }}
          className={`relative flex-1 h-full select-none flex items-center justify-center ${
            hoveredNode ? "cursor-pointer" : "cursor-grab"
          } active:cursor-grabbing`}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Legend — decodes the node/edge language against the light canvas */}
          <div className="absolute top-3 left-4 flex flex-col gap-1.5 text-[10px] font-mono text-ink-secondary bg-surface/85 backdrop-blur px-3 py-2 rounded-lg border border-line shadow-subtle">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: C.cobalt }} />
              <span>Device</span>
              <span className="w-2.5 h-2.5 rounded-full border-2 ml-2" style={{ borderColor: C.slate }} />
              <span>IP / Network</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: C.allow }} />
              <span>Account</span>
              <span className="w-2.5 h-2.5 rounded-full border-2 ml-2" style={{ borderColor: C.challenge }} />
              <span>Card</span>
              <span className="w-2.5 h-2.5 rounded-full border-2 ml-2" style={{ borderColor: C.block }} />
              <span>High risk</span>
            </div>
          </div>

          {/* Floating HUD Instruction Badge */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] font-mono text-ink-muted bg-surface/95 backdrop-blur px-3 py-1.5 rounded-full border border-line shadow-card">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>DRAG TO ORBIT · CLICK NODE TO EXPAND SUBGRAPH · {nodes.length} TOKENS LOADED</span>
          </div>
        </div>

        {/* Interactive Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-80 border-l border-line bg-surface p-5 space-y-4 overflow-y-auto animate-in shadow-pop z-10">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                <h4 className="font-bold text-xs text-ink uppercase tracking-wider font-mono">
                  Token Forensics
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Token Header */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-ink-muted block">Masked Entity Token</span>
              <div className="font-mono text-sm font-bold text-ink flex items-center justify-between">
                <span>{selectedNode.maskedToken}</span>
                <Badge
                  variant={selectedNode.riskScore >= 0.7 ? "danger" : selectedNode.riskScore >= 0.4 ? "warning" : "success"}
                  size="sm"
                >
                  {(selectedNode.riskScore * 100).toFixed(0)}% RISK
                </Badge>
              </div>
              <p className="text-xs text-ink-secondary">{selectedNode.label}</p>
            </div>

            {/* Hop Weight Card */}
            <div className="p-3 bg-surface-subtle rounded border border-line space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-ink-muted">Propagation Radius:</span>
                <span className="font-bold text-ink">{selectedNode.hop}-Hop BFS Link</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Weight Contribution:</span>
                <span className="font-bold text-accent">
                  {selectedNode.hop === 0 ? "1.0x (Origin)" : selectedNode.hop === 1 ? "0.5x (Direct)" : "0.25x (Syndicate)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Last Activity:</span>
                <span className="text-ink">{selectedNode.lastSeen || "Active now"}</span>
              </div>
            </div>

            {/* Linked Merchants (Cross-Merchant Boundary Test) */}
            {selectedNode.linkedMerchants && (
              <div className="space-y-2">
                <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                  Cross-Merchant Blast Radius ({selectedNode.linkedMerchants.length})
                </span>
                <div className="space-y-1">
                  {selectedNode.linkedMerchants.map((m) => (
                    <div key={m} className="p-2 bg-surface-subtle rounded border border-line flex items-center justify-between text-xs font-mono">
                      <span className="text-ink font-semibold">{m}</span>
                      <span className="text-[10px] text-emerald">Linked ✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expand Action Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => handleNodeClick(selectedNode)}
                leftIcon={<GitBranch className="w-3.5 h-3.5" />}
              >
                {selectedNode.expanded ? "Collapse Subgraph" : "Expand 3-Hop Subgraph"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Propagation Weight Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
        <div className="p-3.5 bg-surface rounded-lg border border-line space-y-1 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted text-[10px] uppercase block">Origin Session (0-Hop)</span>
            <Badge variant="neutral" size="sm">1.0x WEIGHT</Badge>
          </div>
          <span className="text-base font-bold text-ink">Active Transaction Tokens</span>
          <span className="text-ink-secondary text-[11px] block">Direct hardware and network fingerprint tokens</span>
        </div>

        <div className="p-3.5 bg-surface rounded-lg border border-line space-y-1 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted text-[10px] uppercase block">Direct Entity Link (1-Hop)</span>
            <Badge variant="info" size="sm">0.5x WEIGHT</Badge>
          </div>
          <span className="text-base font-bold text-accent">Cross-Merchant Cluster</span>
          <span className="text-ink-secondary text-[11px] block">Shared hardware tokens linked across checkout sessions</span>
        </div>

        <div className="p-3.5 bg-surface rounded-lg border border-line space-y-1 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted text-[10px] uppercase block">Syndicate Spread (2-Hop)</span>
            <Badge variant="danger" size="sm">0.25x WEIGHT</Badge>
          </div>
          <span className="text-base font-bold text-red">Coordinated Fraud Ring</span>
          <span className="text-ink-secondary text-[11px] block">Multi-merchant automated card testing propagation</span>
        </div>
      </div>
    </div>
  );
}
