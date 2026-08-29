"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  rowClassName,
  onRowClick,
  emptyMessage = "No data available",
  loading = false,
  striped = true,
  hoverable = true,
  compact = false,
  className,
  ...props
}: TableProps<T>) {
  const alignClasses = { left: "text-left", center: "text-center", right: "text-right" };

  if (loading) {
    return (
      <div className="relative" role="status" aria-live="polite">
        <table className={clsx("w-full", className)} {...props}>
          <thead>
            <tr className="border-b border-line">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    "px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider",
                    alignClasses[col.align || "left"],
                    col.headerClassName
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className={clsx("border-b border-line/50", striped && i % 2 === 0 && "bg-surface-overlay/50")}>
                {columns.map((col) => (
                  <td key={col.key} className={clsx("px-4 py-3", alignClasses[col.align || "left"], col.className)}>
                    <div className="h-4 w-3/4 bg-surface-overlay animate-pulse rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full">
        <table className={clsx("w-full", className)} {...props}>
          <thead>
            <tr className="border-b border-line">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={clsx(
                    "px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider",
                    alignClasses[col.align || "left"],
                    col.headerClassName
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-ink-muted">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" role="region" aria-label="Data table" tabIndex={0}>
      <table className={clsx("w-full border-collapse", className)} {...props}>
        <thead>
          <tr className="border-b border-line bg-surface-overlay/50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={clsx(
                  "px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider",
                  alignClasses[col.align || "left"],
                  col.headerClassName
                )}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={keyExtractor(row, index)}
              className={clsx(
                "border-b border-line/50 transition-colors duration-100",
                striped && index % 2 === 0 && "bg-surface-overlay/30",
                hoverable && "hover:bg-surface-overlay",
                onRowClick && "cursor-pointer",
                rowClassName?.(row, index)
              )}
              onClick={() => onRowClick?.(row, index)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onRowClick) {
                  e.preventDefault();
                  onRowClick(row, index);
                }
              }}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              aria-pressed={false}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(
                    "px-4 py-3 text-sm text-ink",
                    compact && "py-2",
                    alignClasses[col.align || "left"],
                    col.className
                  )}
                >
                  {col.render ? col.render(row, index) : String((row as any)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageSize?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, showPageSize, pageSize, onPageSizeChange, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-line bg-surface-overlay/30">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        {totalItems !== undefined && (
          <span>
            Showing <span className="font-medium text-ink">{Math.min((currentPage - 1) * (pageSize || 10) + 1, totalItems)}</span> to{" "}
            <span className="font-medium text-ink">{Math.min(currentPage * (pageSize || 10), totalItems)}</span> of{" "}
            <span className="font-medium text-ink">{totalItems}</span> results
          </span>
        )}
        {showPageSize && pageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-2 px-2 py-1 text-sm border border-line rounded bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-gold"
            aria-label="Page size"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded border border-line hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="First page"
          aria-disabled={currentPage === 1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded border border-line hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
          aria-disabled={currentPage === 1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="px-3 py-1.5 rounded border border-line hover:bg-surface-overlay transition-colors">1</button>
            {start > 2 && <span className="px-2 text-ink-muted">…</span>}
          </>
        )}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={clsx(
              "px-3 py-1.5 rounded border transition-colors font-medium",
              page === currentPage
                ? "bg-gold text-white border-gold"
                : "border-line hover:bg-surface-overlay text-ink"
            )}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-2 text-ink-muted">…</span>}
            <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 rounded border border-line hover:bg-surface-overlay transition-colors">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded border border-line hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
          aria-disabled={currentPage === totalPages}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded border border-line hover:bg-surface-overlay disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Last page"
          aria-disabled={currentPage === totalPages}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </div>
  );
}