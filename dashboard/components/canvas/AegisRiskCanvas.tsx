"use client";

import React, { useRef, useEffect, useState } from "react";

interface Node3D {
  id: string;
  name: string;
  category: "INGEST" | "FIREWALL" | "GRAPH" | "CALIBRATION" | "POLICY" | "AUDIT" | "WEBHOOK";
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  baseAngle: number;
  size: number;
  color: string;
  pulseSpeed: number;
  description: string;
  metric: string;
  screenX?: number;
  screenY?: number;
  scale?: number;
}

const INITIAL_NODES: Omit<Node3D, "x" | "y" | "z">[] = [
  {
    id: "firewall",
    name: "Behavioral Firewall",
    category: "FIREWALL",
    baseRadius: 160,
    baseAngle: 0,
    size: 10,
    color: "#0F52BA",
    pulseSpeed: 1.8,
    description: "27 deterministic timing & velocity features extracted in sub-1ms.",
    metric: "0.82ms",
  },
  {
    id: "graph",
    name: "Entity Intelligence",
    category: "GRAPH",
    baseRadius: 175,
    baseAngle: (Math.PI * 2) / 6,
    size: 9,
    color: "#7C3AED",
    pulseSpeed: 1.5,
    description: "2-hop cross-merchant graph lookup with masked privacy tokens.",
    metric: "0.77ms",
  },
  {
    id: "calibration",
    name: "Frozen Calibration",
    category: "CALIBRATION",
    baseRadius: 155,
    baseAngle: (Math.PI * 4) / 6,
    size: 9,
    color: "#15803D",
    pulseSpeed: 1.2,
    description: "cal_v1.4 weight matrix & evidence quality index calibration.",
    metric: "0.03ms",
  },
  {
    id: "policy",
    name: "Decision Policy",
    category: "POLICY",
    baseRadius: 180,
    baseAngle: (Math.PI * 6) / 6,
    size: 10,
    color: "#B45309",
    pulseSpeed: 2.0,
    description: "Deterministic threshold evaluation (ALLOW / CHALLENGE / BLOCK).",
    metric: "0.02ms",
  },
  {
    id: "audit",
    name: "Audit Snapshot",
    category: "AUDIT",
    baseRadius: 165,
    baseAngle: (Math.PI * 8) / 6,
    size: 9,
    color: "#111110",
    pulseSpeed: 1.4,
    description: "Immutable SHA-256 decision hash & deterministic replay record.",
    metric: "0.11ms",
  },
  {
    id: "webhook",
    name: "Webhook Dispatcher",
    category: "WEBHOOK",
    baseRadius: 160,
    baseAngle: (Math.PI * 10) / 6,
    size: 9,
    color: "#0F52BA",
    pulseSpeed: 1.6,
    description: "HMAC-SHA256 signed event delivery within 5-min replay window.",
    metric: "0.45ms",
  },
];

interface StarPoint {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
}

export function AegisRiskCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node3D | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: 0.25, y: 0.35 });
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 700);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 480);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };

    window.addEventListener("resize", handleResize);

    // Generate 3D background starry grid particles
    const stars: StarPoint[] = Array.from({ length: 65 }, () => ({
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 450,
      z: (Math.random() - 0.5) * 400,
      size: 1 + Math.random() * 1.5,
      alpha: 0.15 + Math.random() * 0.35,
    }));

    // Data pulses traveling between nodes
    const pulses = Array.from({ length: 14 }, () => ({
      nodeIdx: Math.floor(Math.random() * INITIAL_NODES.length),
      t: Math.random(),
      speed: 0.008 + Math.random() * 0.012,
    }));

    let time = 0;
    const fov = 380;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      const dpr = window.devicePixelRatio || 1;
      const cx = width / 2;
      const cy = height / 2;

      // Auto-rotation angle
      const rotY = rotation.y + time * 0.25;
      const rotX = rotation.x + Math.sin(time * 0.4) * 0.05;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // 1. Draw 3D Background Grid & Depth Dots
      ctx.save();
      stars.forEach((star) => {
        // 3D rotation transform
        const x1 = star.x * cosY - star.z * sinY;
        const z1 = star.z * cosY + star.x * sinY;
        const y1 = star.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + star.y * sinX + 350;

        if (z2 > 10) {
          const scale = fov / z2;
          const sx = cx + x1 * scale * dpr;
          const sy = cy + y1 * scale * dpr;

          ctx.fillStyle = `rgba(17, 17, 16, ${star.alpha * Math.min(scale, 1.2)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, star.size * Math.min(scale, 1.5) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // 2. Draw 3D Orbit Rings in perspective
      const ringSteps = 48;
      [160, 100].forEach((ringRadius, rIdx) => {
        ctx.beginPath();
        ctx.strokeStyle = rIdx === 0 ? "rgba(229, 229, 227, 0.9)" : "rgba(229, 229, 227, 0.5)";
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash(rIdx === 0 ? [4 * dpr, 5 * dpr] : [2 * dpr, 4 * dpr]);

        for (let i = 0; i <= ringSteps; i++) {
          const a = (i / ringSteps) * Math.PI * 2;
          const rx = Math.cos(a) * ringRadius;
          const ry = 0;
          const rz = Math.sin(a) * ringRadius;

          const x1 = rx * cosY - rz * sinY;
          const z1 = rz * cosY + rx * sinY;
          const y1 = ry * cosX - z1 * sinX;
          const z2 = z1 * cosX + ry * sinX + 350;

          const scale = fov / z2;
          const sx = cx + x1 * scale * dpr;
          const sy = cy + y1 * scale * dpr;

          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 3. Project 3D Nodes
      const projectedNodes: Node3D[] = INITIAL_NODES.map((n, idx) => {
        const orbitAngle = n.baseAngle + time * 0.15;
        const nx = Math.cos(orbitAngle) * n.baseRadius;
        const ny = Math.sin(orbitAngle * 2) * 20; // 3D wave oscillation
        const nz = Math.sin(orbitAngle) * n.baseRadius;

        const x1 = nx * cosY - nz * sinY;
        const z1 = nz * cosY + nx * sinY;
        const y1 = ny * cosX - z1 * sinX;
        const z2 = z1 * cosX + ny * sinX + 350;

        const scale = fov / z2;
        const screenX = cx + x1 * scale * dpr;
        const screenY = cy + y1 * scale * dpr;

        return {
          ...n,
          x: nx,
          y: ny,
          z: nz,
          screenX,
          screenY,
          scale,
        };
      });

      // Center Node (TXN Ingestion)
      const centerZ = 350;
      const centerScale = fov / centerZ;
      const centerSx = cx;
      const centerSy = cy;

      // 4. Draw Connecting Lines & Laser Beams
      projectedNodes.forEach((node) => {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(229, 229, 227, 0.85)";
        ctx.lineWidth = 1 * dpr;
        ctx.moveTo(centerSx, centerSy);
        ctx.lineTo(node.screenX!, node.screenY!);
        ctx.stroke();
      });

      // Inter-node network web
      for (let i = 0; i < projectedNodes.length; i++) {
        const next = projectedNodes[(i + 1) % projectedNodes.length];
        ctx.beginPath();
        ctx.strokeStyle = "rgba(229, 229, 227, 0.5)";
        ctx.lineWidth = 0.8 * dpr;
        ctx.moveTo(projectedNodes[i].screenX!, projectedNodes[i].screenY!);
        ctx.lineTo(next.screenX!, next.screenY!);
        ctx.stroke();
      }

      // 5. Draw Animated Data Pulses
      pulses.forEach((p) => {
        p.t += p.speed;
        if (p.t > 1) {
          p.t = 0;
          p.nodeIdx = Math.floor(Math.random() * projectedNodes.length);
        }

        const node = projectedNodes[p.nodeIdx];
        if (!node) return;

        const px = node.screenX! + (centerSx - node.screenX!) * p.t;
        const py = node.screenY! + (centerSy - node.screenY!) * p.t;

        ctx.fillStyle = "#0F52BA";
        ctx.beginPath();
        ctx.arc(px, py, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Draw Center Core Node
      const centerPulse = Math.sin(time * 2.5) * 3 * dpr;
      ctx.save();
      // Outer pulse ring
      ctx.strokeStyle = "rgba(15, 82, 186, 0.35)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(centerSx, centerSy, (26 + centerPulse) * dpr, 0, Math.PI * 2);
      ctx.stroke();

      // Main core
      ctx.fillStyle = "#111110";
      ctx.beginPath();
      ctx.arc(centerSx, centerSy, 20 * dpr, 0, Math.PI * 2);
      ctx.fill();

      // Central Glyph
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `600 ${10 * dpr}px 'IBM Plex Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TXN", centerSx, centerSy);
      ctx.restore();

      // 7. Sort and Render Orbiting Nodes (Z-sorting for 3D realism)
      const sortedNodes = [...projectedNodes].sort((a, b) => b.scale! - a.scale!);

      sortedNodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const nodePulse = Math.sin(time * node.pulseSpeed) * 1.5 * dpr;
        const nodeSize = node.size * node.scale! * dpr;

        ctx.save();

        if (isHovered) {
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2.5 * dpr;
          ctx.beginPath();
          ctx.arc(node.screenX!, node.screenY!, (nodeSize + 7 * dpr), 0, Math.PI * 2);
          ctx.stroke();
        }

        // Node circle
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(node.screenX!, node.screenY!, nodeSize + nodePulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Node Label
        ctx.fillStyle = "#111110";
        ctx.font = `500 ${Math.max(8.5, 9 * node.scale!) * dpr}px 'Inter', sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.screenX!, node.screenY! + (nodeSize + 13 * dpr));

        // Sub metric
        ctx.fillStyle = "#767672";
        ctx.font = `400 ${Math.max(7.5, 8 * node.scale!) * dpr}px 'IBM Plex Mono', monospace`;
        ctx.fillText(node.metric, node.screenX!, node.screenY! + (nodeSize + 23 * dpr));

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [hoveredNode, rotation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      setRotation((prev) => ({
        x: Math.max(-0.6, Math.min(0.6, prev.x + deltaY * 0.005)),
        y: prev.y + deltaX * 0.008,
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dpr = window.devicePixelRatio || 1;
    const cx = (canvas.width / 2) / dpr;
    const cy = (canvas.height / 2) / dpr;

    // Check hit against 3D nodes
    const found = INITIAL_NODES.find((node, idx) => {
      const orbitAngle = node.baseAngle;
      const nx = Math.cos(orbitAngle) * node.baseRadius;
      const ny = 0;
      const nz = Math.sin(orbitAngle) * node.baseRadius;
      const dist = Math.hypot(x - (cx + nx), y - (cy + ny));
      return dist < 30;
    });

    setHoveredNode(found ? (found as any) : null);
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoveredNode(null);
      }}
      className={`relative w-full h-[450px] select-none flex items-center justify-center cursor-grab active:cursor-grabbing ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Interactive Tooltip Inspector */}
      {hoveredNode && (
        <div
          className="absolute z-20 pointer-events-none p-3.5 bg-surface rounded-lg hairline-border shadow-pop text-xs font-sans max-w-xs transition-opacity duration-150"
          style={{ top: 24, right: 24 }}
        >
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-line mb-1.5">
            <span className="font-semibold text-ink">{hoveredNode.name}</span>
            <span className="font-mono text-[10px] text-accent font-bold">{hoveredNode.metric}</span>
          </div>
          <p className="text-ink-secondary text-[11px] leading-relaxed">{hoveredNode.description}</p>
        </div>
      )}

      {/* Floating 3D HUD Badge */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] font-mono text-ink-muted">
        <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
        <span>3D PERSPECTIVE TOPOLOGY · DRAG TO ROTATE AROUND CORE</span>
      </div>
    </div>
  );
}
