"use client";

import React from "react";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T = any> {
  key: string;
  header: string | React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
}

export function Table<T = any>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  rowClassName,
  emptyMessage = "No records found.",
  className,
}: TableProps<T>) {
  return (
    <div className={clsx("w-full overflow-x-auto select-text", className)}>
      <table className="w-full text-left text-xs font-sans border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-subtle/80 text-ink-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={clsx(
                  "py-2.5 px-3.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-ink-muted font-sans text-xs"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-subtle",
                  rowClassName?.(row, index)
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      "py-2.5 px-3.5 text-ink align-middle",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right"
                    )}
                  >
                    {col.render ? col.render(row, index) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-line text-xs text-ink-muted">
      {totalItems !== undefined && (
        <span className="font-mono">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
        </span>
      )}
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 rounded hover:bg-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors border border-line"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono px-2">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 rounded hover:bg-surface-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors border border-line"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}