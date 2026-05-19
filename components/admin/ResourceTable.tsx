'use client';

import React, { useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Tailwind width class e.g. 'w-48' */
  width?: string;
  align?: 'left' | 'right' | 'center';
};

export type ResourceTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  emptyState?: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  /** If provided, clicking the row navigates to this href. */
  rowHref?: (row: T) => string;
  /** Rendered in a final actions column; does NOT propagate row click. */
  rowActions?: (row: T) => React.ReactNode;
};

// ─── Alignment helper ─────────────────────────────────────────────────────────

function alignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResourceTable<T>({
  data,
  columns,
  rowKey,
  emptyState,
  rowHref,
  rowActions,
}: ResourceTableProps<T>) {
  const router = useRouter();
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // ── Keyboard nav: arrow keys move between focusable rows ──────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>, idx: number) => {
      if (!tbodyRef.current) return;
      const rows = Array.from(
        tbodyRef.current.querySelectorAll<HTMLTableRowElement>('tr[tabindex]'),
      );
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        rows[idx + 1]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        rows[idx - 1]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (rowHref) {
          router.push(rowHref(data[idx]));
        }
      }
    },
    [data, rowHref, router],
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
        <h3 className="text-base font-semibold text-foreground mb-1">
          {emptyState?.title ?? 'Nothing here yet.'}
        </h3>
        {emptyState?.description && (
          <p className="text-sm text-muted-foreground max-w-xs mt-1 mb-4">
            {emptyState.description}
          </p>
        )}
        {emptyState?.action && (
          <div className="mt-4">{emptyState.action}</div>
        )}
      </div>
    );
  }

  const showActions = Boolean(rowActions);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Horizontal scroll on narrow screens */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] caption-bottom text-sm">
          <thead>
            <tr className="border-b border-border bg-[oklch(0.175_0.002_286)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'py-3 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground first:pl-4 last:pr-4',
                    alignClass(col.align),
                    col.width,
                  )}
                >
                  {col.header}
                </th>
              ))}
              {showActions && (
                <th
                  scope="col"
                  className="py-3 pl-3 pr-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody ref={tbodyRef} className="divide-y divide-border">
            {data.map((row, idx) => {
              const key = rowKey(row);
              const href = rowHref?.(row);
              const isClickable = Boolean(href);

              return (
                <tr
                  key={key}
                  tabIndex={isClickable ? 0 : undefined}
                  role={isClickable ? 'link' : undefined}
                  aria-label={isClickable ? `Open ${key}` : undefined}
                  onClick={
                    isClickable
                      ? () => router.push(href!)
                      : undefined
                  }
                  onKeyDown={
                    isClickable
                      ? (e) => handleKeyDown(e, idx)
                      : undefined
                  }
                  className={cn(
                    'border-b border-border transition-colors',
                    'hover:bg-[oklch(0.198_0.003_286)]',
                    isClickable && 'cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    // Mobile: collapse to cards at < 768px via stacked display
                    'max-md:block max-md:border max-md:rounded-lg max-md:border-border max-md:mb-2 max-md:mx-2 max-md:overflow-hidden',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-3 px-3 first:pl-4 last:pr-4',
                        alignClass(col.align),
                        col.width,
                        // Mobile: stack cells with label
                        'max-md:flex max-md:items-start max-md:gap-2 max-md:py-2 max-md:px-4 max-md:border-b max-md:border-border/40 max-md:last:border-b-0',
                      )}
                      data-label={col.header}
                    >
                      {/* Mobile label */}
                      <span className="md:hidden text-xs text-muted-foreground uppercase tracking-wide shrink-0 w-24">
                        {col.header}
                      </span>
                      <span className="text-sm text-foreground">{col.cell(row)}</span>
                    </td>
                  ))}
                  {showActions && (
                    <td
                      className="py-3 pl-3 pr-4 text-right max-md:flex max-md:items-center max-md:justify-end max-md:px-4 max-md:py-2"
                      // Stop the row-click from firing when interacting with actions
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rowActions!(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Footer count */}
      <div className="border-t border-border bg-[oklch(0.175_0.002_286)] px-4 py-2">
        <p className="text-xs text-muted-foreground">
          {data.length} {data.length === 1 ? 'row' : 'rows'}
        </p>
      </div>
    </div>
  );
}
