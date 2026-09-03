"use client";

import React, { useRef, useEffect } from "react";

interface NodePoint {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  alpha: number;
}

interface StreamPulse {
  lineIndex: number;
  progress: number;
  speed: number;
  length: number;
}

export function Hero3DBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1));
    let height = (canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      height = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current.targetX = nx * 0.8;
      mouseRef.current.targetY = ny * 0.8;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // 3D Perspective Grid Points (Financial Mesh)
    const cols = 22;
    const rows = 14;
    const points: NodePoint[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * 65;
        const y = (r - rows / 2) * 45 + 80;
        const z = r * 35; // perspective depth
        points.push({
          x,
          y,
          z,
          baseX: x,
          baseY: y,
          baseZ: z,
          size: 1.5,
          alpha: Math.max(0.12, 1 - r / rows),
        });
      }
    }

    // 3D streaming risk data pulses
    const streamPulses: StreamPulse[] = Array.from({ length: 18 }, () => ({
      lineIndex: Math.floor(Math.random() * cols),
      progress: Math.random(),
      speed: 0.006 + Math.random() * 0.008,
      length: 0.15 + Math.random() * 0.2,
    }));

    let time = 0;
    const fov = 420;

    const render = () => {
      time += 0.018;

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const dpr = window.devicePixelRatio || 1;
      const cx = width / 2;
      const cy = height * 0.45;

      const rotY = mouseRef.current.x * 0.6;
      const rotX = 0.35 + mouseRef.current.y * 0.4;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project grid points
      const projected = points.map((p, idx) => {
        // Dynamic wave oscillation
        const wave = Math.sin(time * 2 + p.baseX * 0.015 + p.baseZ * 0.02) * 12;
        const py = p.baseY + wave;

        const x1 = p.baseX * cosY - p.baseZ * sinY;
        const z1 = p.baseZ * cosY + p.baseX * sinY;
        const y1 = py * cosX - z1 * sinX;
        const z2 = z1 * cosX + py * sinX + 320;

        const scale = fov / Math.max(z2, 20);
        const sx = cx + x1 * scale * dpr;
        const sy = cy + y1 * scale * dpr;

        return { sx, sy, scale, alpha: p.alpha, z2 };
      });

      // 1. Draw 3D Grid Connecting Lines (Horizontal & Depth)
      ctx.save();
      ctx.lineWidth = 0.8 * dpr;

      // Draw Depth Lines
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const idx = r * cols + c;
          const pt = projected[idx];
          if (r === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }
        ctx.strokeStyle = `rgba(220, 220, 218, 0.7)`;
        ctx.stroke();
      }

      // Draw Horizontal Cross Lines
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const pt = projected[idx];
          if (c === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }
        const alpha = Math.max(0.08, 0.5 - r / rows * 0.4);
        ctx.strokeStyle = `rgba(220, 220, 218, ${alpha})`;
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw 3D Animated Risk Data Beams streaming down columns
      ctx.save();
      streamPulses.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) {
          p.progress = 0;
          p.lineIndex = Math.floor(Math.random() * cols);
        }

        const startRow = Math.floor(p.progress * (rows - 1));
        const nextRow = Math.min(startRow + 1, rows - 1);
        const frac = (p.progress * (rows - 1)) - startRow;

        const idx1 = startRow * cols + p.lineIndex;
        const idx2 = nextRow * cols + p.lineIndex;

        const pt1 = projected[idx1];
        const pt2 = projected[idx2];

        if (pt1 && pt2) {
          const bx = pt1.sx + (pt2.sx - pt1.sx) * frac;
          const by = pt1.sy + (pt2.sy - pt1.sy) * frac;

          // Glowing blue risk evaluation packet
          ctx.fillStyle = "rgba(15, 82, 186, 0.85)";
          ctx.beginPath();
          ctx.arc(bx, by, 3 * pt1.scale * dpr, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(15, 82, 186, 0.25)";
          ctx.beginPath();
          ctx.arc(bx, by, 7 * pt1.scale * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();

      // 3. Draw Grid Intersection Nodes
      projected.forEach((pt) => {
        if (pt.scale > 0.4) {
          ctx.fillStyle = `rgba(17, 17, 16, ${pt.alpha * 0.35})`;
          ctx.beginPath();
          ctx.arc(pt.sx, pt.sy, 1.2 * pt.scale * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block opacity-90" />
      {/* Bottom fade out into clean canvas */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/40 to-surface" />
    </div>
  );
}
