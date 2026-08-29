"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised" | "outlined" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

const variantStyles = {
  default: "bg-surface-raised border border-line",
  raised: "bg-surface-raised shadow-card",
  outlined: "bg-transparent border-2 border-line",
  interactive: "bg-surface-raised border border-line hover:border-gold/50 hover:shadow-card transition-all duration-200 cursor-pointer",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "default", padding = "md", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-xl",
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={clsx("mb-4", className)} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className, ...props }, ref) => (
    <h3
      ref={ref}
      className={clsx("text-xl font-semibold text-ink tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx("text-sm text-ink-muted mt-1", className)}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={clsx(className)} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("mt-4 pt-4 border-t border-line flex items-center gap-3", className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = "CardFooter";