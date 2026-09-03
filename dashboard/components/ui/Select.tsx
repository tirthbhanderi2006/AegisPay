"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className, disabled, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-ink-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={clsx(
              "w-full h-8 pl-2.5 pr-8 bg-surface text-ink text-xs font-sans rounded border border-line appearance-none transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-surface-subtle disabled:text-ink-faint disabled:cursor-not-allowed cursor-pointer",
              error && "border-red focus:border-red focus:ring-red",
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
        </div>
        {error && <p className="text-[11px] text-red mt-0.5">{error}</p>}
        {!error && helperText && <p className="text-[11px] text-ink-muted mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";