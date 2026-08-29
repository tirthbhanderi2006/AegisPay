"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { clsx } from "clsx";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

export function Tooltip({ content, children, position = "top", delay = 200, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowStyles = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gold",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gold",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gold",
    right: "right-full top-1/2 -translate-y-1/2 border-r-gold",
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="inline-block"
      tabIndex={0}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={clsx(
            "fixed z-50 px-3 py-2 text-xs font-medium text-white bg-gold rounded-lg shadow-lg",
            "animate-in",
            "whitespace-nowrap max-w-[300px]",
            positionStyles[position],
            className
          )}
          role="tooltip"
          aria-hidden="true"
        >
          {content}
          <div
            className={clsx(
              "absolute w-0 h-0 border-4 border-transparent",
              arrowStyles[position]
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}