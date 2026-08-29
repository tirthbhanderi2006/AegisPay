"use client";

import { forwardRef, type SelectHTMLAttributes, type OptionHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, placeholder, options, fullWidth = true, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    return (
      <div className={clsx("w-full", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-ink mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              "w-full rounded-md border bg-surface text-ink appearance-none",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "pl-4 pr-10 py-2.5 text-sm",
              error
                ? "border-red focus:ring-red"
                : "border-line hover:border-line-strong",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={clsx(error && errorId, hint && hintId)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-ink-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";