"use client";

import React, { useRef, useEffect, useState } from "react";

interface Scroll3DContainerProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  direction?: "up" | "down" | "tilt";
}

export function Scroll3DContainer({
  children,
  className = "",
  intensity = 1.0,
  direction = "tilt",
}: Scroll3DContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState("");
  const [mouseTilt, setMouseTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress from -1 (above viewport) to 1 (below viewport)
      const centerOffset = (rect.top + rect.height / 2) - windowHeight / 2;
      const normalizedOffset = Math.max(-1, Math.min(1, centerOffset / (windowHeight / 2)));

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (direction === "tilt") {
            const rotX = normalizedOffset * 7 * intensity;
            const translateZ = (1 - Math.abs(normalizedOffset)) * 25 * intensity;
            setTransformStyle(
              `perspective(1200px) rotateX(${rotX}deg) translateZ(${translateZ}px)`
            );
          } else if (direction === "up") {
            const rotX = Math.max(0, normalizedOffset * 10 * intensity);
            const translateY = normalizedOffset * 20 * intensity;
            setTransformStyle(
              `perspective(1200px) rotateX(${rotX}deg) translateY(${translateY}px)`
            );
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [intensity, direction]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ rx: -y * 8, ry: x * 8 });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ rx: 0, ry: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{
        transform: `${transformStyle} rotateX(${mouseTilt.rx}deg) rotateY(${mouseTilt.ry}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}
