"use client";

import { type ReactNode } from "react";
import { clsx } from "clsx";

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "square";
  fallback?: ReactNode;
  className?: string;
}

const sizeStyles = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

const shapeStyles = {
  circle: "rounded-full",
  square: "rounded-lg",
};

const colorPalette = [
  "bg-purple text-white",
  "bg-gold text-slate-950",
  "bg-emerald text-white",
  "bg-azure text-white",
  "bg-red text-white",
  "bg-amber text-white",
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, alt, name, size = "md", shape = "circle", fallback, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={alt || name || "Avatar"}
        className={clsx(sizeStyles[size], shapeStyles[shape], "object-cover", className)}
        onError={() => setImgError(true)}
      />
    );
  }

  const bgColor = name ? getColorFromName(name) : "bg-surface-overlay text-ink-muted";

  return (
    <div
      className={clsx(
        sizeStyles[size],
        shapeStyles[shape],
        "inline-flex items-center justify-center font-medium select-none",
        bgColor,
        className
      )}
      role="img"
      aria-label={name || alt || "Avatar"}
    >
      {fallback || (name ? getInitials(name) : "?")}
    </div>
  );
}

import { useState } from "react";

export function AvatarGroup({ avatars, max = 5, size = "md", className }: { avatars: AvatarProps[]; max?: number; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={clsx("flex -space-x-2", className)} aria-label={`${avatars.length} users`}>
      {visible.map((avatar, index) => (
        <div key={index} className="relative z-10" style={{ zIndex: max - index }}>
          <Avatar {...avatar} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={clsx(
            sizeStyles[size],
            "rounded-full bg-surface-overlay border-2 border-surface-raised",
            "flex items-center justify-center font-medium text-ink-muted"
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}