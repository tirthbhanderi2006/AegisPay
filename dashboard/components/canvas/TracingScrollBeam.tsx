"use client";

import React, { useEffect, useRef, useState } from "react";

export function TracingScrollBeam({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeight = rect.height;

      // Calculate progress from 0% when top reaches viewport center to 100% when bottom reaches center
      const current = windowHeight * 0.5 - rect.top;
      const progress = Math.max(0, Math.min(1, current / totalHeight));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Vertical Tracing Beam Line */}
      <div className="absolute left-0 sm:left-4 top-8 bottom-8 w-px bg-line/60 pointer-events-none hidden md:block">
        {/* Animated Glowing Trail */}
        <div
          className="w-full bg-accent transition-all duration-150 ease-out shadow-[0_0_8px_rgba(15,82,186,0.6)]"
          style={{ height: `${scrollProgress * 100}%` }}
        />
        {/* Glowing Head Dot */}
        <div
          className="absolute -left-[3px] w-2 h-2 rounded-full bg-accent ring-4 ring-accent/20 transition-all duration-150 ease-out"
          style={{ top: `${scrollProgress * 100}%` }}
        />
      </div>

      <div className="md:pl-10">{children}</div>
    </div>
  );
}
