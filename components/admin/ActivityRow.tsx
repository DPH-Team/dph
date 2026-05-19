'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuditLogEntry } from '@/lib/db/schema';

// ─── Action color helpers ─────────────────────────────────────────────────────

type ActionVariant = 'success' | 'failure' | 'delete' | 'neutral';

function classifyAction(action: string): ActionVariant {
  if (action.includes('failure')) return 'failure';
  if (action.includes('delete')) return 'delete';
  if (
    action.includes('success') ||
    action.includes('create') ||
    action.includes('update')
  )
    return 'success';
  return 'neutral';
}

const variantClasses: Record<ActionVariant, string> = {
  success: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  failure: 'bg-red-950 text-red-300 border-red-800',
  delete: 'bg-amber-950 text-amber-300 border-amber-800',
  neutral: 'bg-[oklch(0.235_0.004_286)] text-foreground border-border',
};

// ─── Relative time formatting ─────────────────────────────────────────────────

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAbsolute(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ActivityRowProps {
  entry: AuditLogEntry;
}

export function ActivityRow({ entry }: ActivityRowProps) {
  const [expanded, setExpanded] = useState(false);
  const variant = classifyAction(entry.action);
  const occurredAt = new Date(entry.occurredAt);

  const hasDetails =
    entry.diff != null || entry.metadata != null;

  const entityDisplay =
    entry.entityType && entry.entityId
      ? `${entry.entityType}/${entry.entityId}`
      : entry.entityType
        ? entry.entityType
        : null;

  return (
    <>
      {/* Main row */}
      <tr
        className="border-b border-border transition-colors hover:bg-[oklch(0.198_0.003_286)]"
        aria-expanded={hasDetails ? expanded : undefined}
      >
        {/* When */}
        <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm">
          <time
            dateTime={occurredAt.toISOString()}
            title={formatAbsolute(occurredAt)}
            className="text-muted-foreground tabular-nums"
          >
            {formatRelative(occurredAt)}
          </time>
        </td>

        {/* Actor */}
        <td className="whitespace-nowrap px-3 py-3 text-sm text-foreground">
          {entry.actorEmail ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </td>

        {/* Action */}
        <td className="whitespace-nowrap px-3 py-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              variantClasses[variant],
            )}
          >
            {entry.action}
          </span>
        </td>

        {/* Entity */}
        <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground font-mono text-xs">
          {entityDisplay ?? <span>—</span>}
        </td>

        {/* IP */}
        <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground font-mono text-xs">
          {entry.ip ?? '—'}
        </td>

        {/* Details toggle */}
        <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right">
          {hasDetails ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-[oklch(0.235_0.004_286)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label={expanded ? 'Hide details' : 'Show details'}
            >
              {expanded ? (
                <ChevronDown className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden="true" />
              )}
              Details
            </button>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          )}
        </td>
      </tr>

      {/* Expansion row */}
      {expanded && hasDetails && (
        <tr className="border-b border-border bg-[oklch(0.175_0.002_286)]">
          <td colSpan={6} className="px-4 py-4">
            <div className="flex flex-col gap-3">
              {entry.diff != null && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Diff
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-[oklch(0.140_0.002_286)] p-3 text-xs text-foreground leading-relaxed">
                    {JSON.stringify(entry.diff, null, 2)}
                  </pre>
                </div>
              )}
              {entry.metadata != null && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Metadata
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-[oklch(0.140_0.002_286)] p-3 text-xs text-foreground leading-relaxed">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {entry.userAgent && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">User Agent:</span>{' '}
                  {entry.userAgent}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
