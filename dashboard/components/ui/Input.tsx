"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, fullWidth = true, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className={clsx("w-full", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "w-full rounded-md border bg-surface text-ink placeholder-ink-muted",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon ? "pl-10" : "pl-4",
              rightIcon ? "pr-10" : "pr-4",
              "py-2.5 text-sm",
              error
                ? "border-red focus:ring-red"
                : "border-line hover:border-line-strong",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={clsx(error && errorId, hint && hintId)}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
              {rightIcon}
            </div>
          )}
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

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string; fullWidth?: boolean }>(
  ({ label, error, hint, fullWidth = true, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className={clsx("w-full", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-ink mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            "w-full rounded-md border bg-surface text-ink placeholder-ink-muted resize-y min-h-[80px]",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "p-4 text-sm",
            error
              ? "border-red focus:ring-red"
              : "border-line hover:border-line-strong",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={clsx(error && errorId, hint && hintId)}
          {...props}
        />
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

Textarea.displayName = "Textarea";