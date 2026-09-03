"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "flat" | "raised" | "subtle" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "raised", padding = "md", className, children, ...props }, ref) => {
    const variantStyles = {
      flat: "bg-surface border border-line",
      raised: "bg-surface border border-line shadow-card",
      subtle: "bg-surface-subtle border border-line",
      outlined: "bg-transparent border border-line",
    };

    const paddingStyles = {
      none: "p-0",
      sm: "p-3",
      md: "p-4 sm:p-5",
      lg: "p-6 sm:p-7",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-lg transition-colors overflow-hidden",
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

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("flex flex-col space-y-1 pb-3 border-b border-line mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx("font-sans text-sm font-semibold text-ink tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={clsx("text-xs text-ink-muted leading-normal", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("space-y-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("pt-3 border-t border-line mt-4 flex items-center justify-between text-xs", className)} {...props}>
      {children}
    </div>
  );
}