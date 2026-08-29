"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownItem {
  value?: string;
  label?: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode | ((props: { isOpen: boolean; toggle: () => void }) => ReactNode);
  items: DropdownItem[];
  onSelect: (value: string) => void;
  align?: "left" | "right";
  width?: number | "trigger";
  className?: string;
}

export function Dropdown({ trigger, items, onSelect, align = "left", width = "trigger", className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const dropdownContent = (
    <div
      className={clsx(
        "fixed z-50 mt-1.5 min-w-[180px] bg-surface-raised rounded-lg shadow-pop border border-line",
        "animate-in",
        align === "left" ? "left-0" : "right-0",
        className
      )}
      ref={dropdownRef}
      role="menu"
      style={{
        width: width === "trigger" ? triggerRef.current?.offsetWidth : width,
        minWidth: width === "trigger" ? undefined : 180,
      }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={`divider-${index}`} className="my-1 border-t border-line" role="separator" />;
        }
        return (
          <button
            key={item.value || index}
            onClick={() => {
              if (!item.disabled && item.value !== undefined) {
                onSelect(item.value);
                setIsOpen(false);
              }
            }}
            disabled={item.disabled}
            role="menuitem"
            className={clsx(
              "w-full px-4 py-2.5 text-sm flex items-center gap-3 transition-colors",
              "focus:outline-none focus:bg-surface-overlay",
              item.danger ? "text-red hover:bg-red/10" : "text-ink hover:bg-surface-overlay",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {item.icon && <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">{item.icon}</span>}
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {typeof trigger === "function" ? (
        trigger({ isOpen, toggle: () => setIsOpen((o) => !o) })
      ) : (
        <button
          onClick={() => setIsOpen((o) => !o)}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border",
            "bg-surface text-ink border-line hover:border-line-strong",
            "focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent",
            "transition-colors duration-150",
            className
          )}
          aria-haspopup="true"
          aria-expanded={isOpen}
          type="button"
        >
          {trigger}
          <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
        </button>
      )}
      {isOpen && typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
    </div>
  );
}

export interface SelectDropdownProps {
  value: string;
  items: DropdownItem[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectDropdown({ value, items, onChange, placeholder, disabled, className }: SelectDropdownProps) {
  const selectedItem = items.find((i) => i.value === value);
  return (
    <Dropdown
      trigger={
        <span className="flex items-center justify-between gap-2">
          <span className={clsx("truncate", !selectedItem && placeholder && "text-ink-muted")}>
            {selectedItem?.label || placeholder || "Select..."}
          </span>
        </span>
      }
      items={items}
      onSelect={onChange}
      className={className}
    />
  );
}