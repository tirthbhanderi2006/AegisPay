"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { clsx } from "clsx";

export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export const Separator = forwardRef<HTMLHRElement, SeparatorProps>(
  ({ orientation = "horizontal", decorative = true, className, ...props }, ref) => (
    <hr
      ref={ref}
      className={clsx(
        "bg-line border-0",
        orientation === "horizontal" ? "w-full h-px" : "h-full w-px",
        className
      )}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      {...props}
    />
  )
);

Separator.displayName = "Separator";