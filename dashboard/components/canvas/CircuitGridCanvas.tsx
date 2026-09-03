"use client";

import React, { useEffect, useRef } from "react";

interface GridNode {
  x: number;
  y: number;
  pulsePhase: number;
}

interface PulseBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  speed: number;
  horizontal: boolean;
}

export function CircuitGridCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    const gridSize = 48;
    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;

    // Glowing circuit beams traveling along the grid
    const beams: PulseBeam[] = Array.from({ length: 14 }, () => {
      const horizontal = Math.random() > 0.5;
      const c = Math.floor(Math.random() * cols);
      const r = Math.floor(Math.random() * rows);
      return {
        startX: c * gridSize,
        startY: r * gridSize,
        endX: horizontal ? (c + Math.floor(2 + Math.random() * 4)) * gridSize : c * gridSize,
        endY: horizontal ? r * gridSize : (r + Math.floor(2 + Math.random() * 4)) * gridSize,
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.012,
        horizontal,
      };
    });

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Subtle Hairline Circuit Grid
      ctx.save();
      ctx.strokeStyle = "rgba(229, 229, 227, 0.4)";
      ctx.lineWidth = 0.6;

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw Crossroads '+' Crosshairs
      ctx.fillStyle = "rgba(17, 17, 16, 0.18)";
      ctx.font = "8px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let x = 0; x <= width; x += gridSize * 2) {
        for (let y = 0; y <= height; y += gridSize * 2) {
          ctx.fillText("+", x, y);
        }
      }
      ctx.restore();

      // 3. Draw Traveling Laser Pulses along the Grid
      ctx.save();
      beams.forEach((beam) => {
        beam.progress += beam.speed;
        if (beam.progress > 1) {
          beam.progress = 0;
          const horizontal = Math.random() > 0.5;
          const c = Math.floor(Math.random() * cols);
          const r = Math.floor(Math.random() * rows);
          beam.startX = c * gridSize;
          beam.startY = r * gridSize;
          beam.endX = horizontal ? (c + 3) * gridSize : c * gridSize;
          beam.endY = horizontal ? r * gridSize : (r + 3) * gridSize;
          beam.horizontal = horizontal;
        }

        const curX = beam.startX + (beam.endX - beam.startX) * beam.progress;
        const curY = beam.startY + (beam.endY - beam.startY) * beam.progress;

        // Glowing blue head
        ctx.fillStyle = "#0F52BA";
        ctx.beginPath();
        ctx.arc(curX, curY, 2, 0, Math.PI * 2);
        ctx.fill();

        // Trail beam
        ctx.strokeStyle = "rgba(15, 82, 186, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(beam.startX + (beam.endX - beam.startX) * Math.max(0, beam.progress - 0.25), beam.startY + (beam.endY - beam.startY) * Math.max(0, beam.progress - 0.25));
        ctx.lineTo(curX, curY);
        ctx.stroke();
      });
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
