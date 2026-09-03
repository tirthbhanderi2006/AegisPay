"use client";

import React, { useEffect, useRef, useState } from "react";

type StorySection = "hero" | "demo" | "tracks" | "signals" | "graph" | "replay" | "security" | "modules" | "metrics" | "cta";

export function DynamicStory3DBackground({
  activeSection = "hero",
  className = "",
}: {
  activeSection?: StorySection;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollRef = useRef({ y: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) - 0.5;
      const ny = (e.clientY / window.innerHeight) - 0.5;
      mouseRef.current.targetX = nx;
      mouseRef.current.targetY = ny;
    };

    const handleScroll = () => {
      scrollRef.current.targetY = window.scrollY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initialize scroll
    handleScroll();
    scrollRef.current.y = scrollRef.current.targetY;

    // 3D Particles for Section Morphing
    const particles = Array.from({ length: 80 }, () => ({
      x: (Math.random() - 0.5) * 1200,
      y: (Math.random() - 0.5) * 800,
      z: Math.random() * 800,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1.5 + Math.random() * 2.5,
      alpha: 0.2 + Math.random() * 0.4,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Smooth interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      scrollRef.current.y += (scrollRef.current.targetY - scrollRef.current.y) * 0.08;

      const cx = width / 2;
      const cy = height / 2;
      const scrollProgress = scrollRef.current.y / 1000; // Normalizer

      // Base camera rotations driven by SCROLL + MOUSE
      let targetRotY = mouseRef.current.x * 0.4 + Math.sin(scrollProgress * 0.5) * 0.3;
      let targetRotX = mouseRef.current.y * 0.3 + Math.cos(scrollProgress * 0.4) * 0.2;
      let gridAlpha = 0.25;
      
      // Zoom effect based on scroll
      let cameraZ = 300 + Math.sin(scrollProgress) * 100;

      if (activeSection === "graph") {
        targetRotY += time * 0.2 + scrollProgress * 0.5;
        gridAlpha = 0.5;
        cameraZ -= 100; // Zoom in
      } else if (activeSection === "demo") {
        targetRotX += 0.3 + scrollProgress * 0.2;
        cameraZ += 50; // Zoom out
      } else if (activeSection === "hero") {
        targetRotY += scrollProgress * 0.8;
      }

      const cosY = Math.cos(targetRotY);
      const sinY = Math.sin(targetRotY);
      const cosX = Math.cos(targetRotX);
      const sinX = Math.sin(targetRotX);
      const fov = 400;

      // 1. Draw 3D Perspective Grid
      ctx.save();
      ctx.strokeStyle = `rgba(229, 229, 227, ${gridAlpha})`;
      ctx.lineWidth = 0.7;

      const gridSize = 100;
      const gridCount = 12;

      for (let i = -gridCount; i <= gridCount; i++) {
        // Vertical lines
        const x = i * gridSize;
        const zStart = -200;
        const zEnd = gridCount * gridSize;

        const x1 = x * cosY - zStart * sinY;
        const z1 = zStart * cosY + x * sinY + cameraZ;
        const x2 = x * cosY - zEnd * sinY;
        const z2 = zEnd * cosY + x * sinY + cameraZ;

        const s1 = fov / Math.max(z1, 10);
        const s2 = fov / Math.max(z2, 10);

        ctx.beginPath();
        ctx.moveTo(cx + x1 * s1, cy + 220 * s1);
        ctx.lineTo(cx + x2 * s2, cy + 220 * s2);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw 3D Floating Particles (Reacting to Scroll Velocity)
      const scrollVelocity = (scrollRef.current.targetY - scrollRef.current.y) * 0.01;

      particles.forEach((p) => {
        // Scroll moves particles dynamically
        p.z -= 0.6 + scrollVelocity * 2;
        if (p.z < 0) p.z = 800;
        if (p.z > 800) p.z = 0;

        p.x += p.vx + Math.sin(time + p.z) * 0.2;
        p.y += p.vy + Math.cos(time + p.x) * 0.2;

        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX + cameraZ;

        if (z2 > 10) {
          const scale = fov / z2;
          const sx = cx + x1 * scale;
          const sy = cy + y1 * scale;

          ctx.fillStyle = activeSection === "graph" || activeSection === "security" 
            ? `rgba(15, 82, 186, ${p.alpha * Math.min(1, scale)})` 
            : `rgba(17, 17, 16, ${p.alpha * Math.min(1, scale)})`;
            
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeSection]);

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block opacity-70 blur-[1px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-canvas/20 to-canvas/80" />
    </div>
  );
}
