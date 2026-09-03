"use client";

import React, { forwardRef } from "react";
import { clsx } from "clsx";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helperText, className, disabled, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-ink-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-2.5 text-ink-muted pointer-events-none flex items-center">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={clsx(
              "w-full h-8 px-2.5 bg-surface text-ink text-xs font-sans rounded border border-line transition-colors placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-surface-subtle disabled:text-ink-faint disabled:cursor-not-allowed",
              leftIcon && "pl-8",
              rightIcon && "pr-8",
              error && "border-red focus:border-red focus:ring-red",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-2.5 text-ink-muted pointer-events-none flex items-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-red mt-0.5">{error}</p>}
        {!error && helperText && <p className="text-[11px] text-ink-muted mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, disabled, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-ink-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={clsx(
            "w-full p-2.5 bg-surface text-ink text-xs font-sans rounded border border-line transition-colors placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-surface-subtle disabled:text-ink-faint disabled:cursor-not-allowed",
            error && "border-red focus:border-red focus:ring-red",
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red mt-0.5">{error}</p>}
        {!error && helperText && <p className="text-[11px] text-ink-muted mt-0.5">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";