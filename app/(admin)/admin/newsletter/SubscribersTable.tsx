'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { Subscriber } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import {
  unsubscribeSubscriberAction,
  resubscribeSubscriberAction,
  deleteSubscriberAction,
} from './actions';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAbsolute(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCompact(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sourceLabel(source: string): string {
  if (source === 'public_form') return 'Public form';
  if (source === 'manual') return 'Manual';
  return source;
}

// ─── Row actions ──────────────────────────────────────────────────────────────

function UnsubscribeButton({ id }: { id: string }) {
  // Wrap in void so form action type matches (formData: FormData) => void | Promise<void>.
  async function action() {
    await unsubscribeSubscriberAction(id);
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="h-7 rounded-[var(--radius-sm)] border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
      >
        Unsubscribe
      </button>
    </form>
  );
}

function ResubscribeButton({ id }: { id: string }) {
  async function action() {
    await resubscribeSubscriberAction(id);
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="h-7 rounded-[var(--radius-sm)] border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
      >
        Resubscribe
      </button>
    </form>
  );
}

function DeleteButton({ id, email }: { id: string; email: string }) {
  async function action() {
    await deleteSubscriberAction(id);
  }
  return (
    <form action={action}>
      <button
        type="submit"
        aria-label={`Delete ${email}`}
        onClick={(e) => {
          if (!confirm(`Delete ${email}? This cannot be undone.`)) {
            e.preventDefault();
          }
        }}
        className="size-7 inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type SubscriberStatus = 'confirmed' | 'pending' | 'unsubscribed';

function deriveStatus(
  confirmedAt: Date | null | string,
  unsubscribedAt: Date | null | string,
): SubscriberStatus {
  if (unsubscribedAt !== null) return 'unsubscribed';
  if (confirmedAt !== null) return 'confirmed';
  return 'pending';
}

// ─── Status cell ──────────────────────────────────────────────────────────────

function StatusCell({
  confirmedAt,
  unsubscribedAt,
}: {
  confirmedAt: Date | null | string;
  unsubscribedAt: Date | null | string;
}) {
  const status = deriveStatus(confirmedAt, unsubscribedAt);

  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
        Active
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
        Pending
      </span>
    );
  }
  // unsubscribed
  const unsubDate =
    unsubscribedAt instanceof Date ? unsubscribedAt : new Date(unsubscribedAt!);
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Unsubscribed · {formatCompact(unsubDate)}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SubscribersTableProps {
  subscribers: Subscriber[];
  hasFilters: boolean;
}

export function SubscribersTable({
  subscribers,
  hasFilters,
}: SubscribersTableProps) {
  if (subscribers.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-[oklch(0.200_0.004_286)] px-6 py-12 text-center">
        {hasFilters ? (
          <>
            <p className="text-sm font-medium text-foreground">
              No subscribers match the current filters.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link
                href="/admin/newsletter"
                className="text-primary hover:underline"
              >
                Clear filters
              </Link>{' '}
              to see all subscribers.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              No subscribers yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The newsletter signup form on the public site will populate this
              list.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[oklch(0.200_0.004_286)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">
                Subscribed
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-48">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground w-40">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {subscribers.map((sub) => (
              <tr
                key={sub.id}
                className="bg-[oklch(0.185_0.004_286)] transition-colors hover:bg-[oklch(0.200_0.004_286)]"
              >
                {/* Email with status dot */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 rounded-full shrink-0',
                        sub.unsubscribedAt !== null
                          ? 'bg-muted-foreground'
                          : sub.confirmedAt !== null
                            ? 'bg-emerald-400'
                            : 'bg-amber-400',
                      )}
                    />
                    <span className="font-mono text-sm text-foreground">
                      {sub.email}
                    </span>
                  </div>
                </td>

                {/* Source badge */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-2 py-0.5 text-xs text-muted-foreground">
                    {sourceLabel(sub.source)}
                  </span>
                </td>

                {/* Subscribed relative time */}
                <td className="px-4 py-3">
                  <span
                    title={formatAbsolute(new Date(sub.subscribedAt))}
                    className="tabular-nums text-foreground"
                  >
                    {relativeTime(new Date(sub.subscribedAt))}
                  </span>
                </td>

                {/* Status pill */}
                <td className="px-4 py-3">
                  <StatusCell
                    confirmedAt={sub.confirmedAt}
                    unsubscribedAt={sub.unsubscribedAt}
                  />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {sub.unsubscribedAt !== null ? (
                      <ResubscribeButton id={sub.id} />
                    ) : (
                      <UnsubscribeButton id={sub.id} />
                    )}
                    <DeleteButton id={sub.id} email={sub.email} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border md:hidden">
        {subscribers.map((sub) => (
          <div
            key={sub.id}
            className="bg-[oklch(0.185_0.004_286)] px-4 py-4 space-y-3"
          >
            {/* Email + status dot */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 rounded-full shrink-0 mt-0.5',
                    sub.unsubscribedAt !== null
                      ? 'bg-muted-foreground'
                      : sub.confirmedAt !== null
                        ? 'bg-emerald-400'
                        : 'bg-amber-400',
                  )}
                />
                <span className="font-mono text-sm text-foreground truncate">
                  {sub.email}
                </span>
              </div>
              <StatusCell
                confirmedAt={sub.confirmedAt}
                unsubscribedAt={sub.unsubscribedAt}
              />
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-2 py-0.5">
                {sourceLabel(sub.source)}
              </span>
              <span
                title={formatAbsolute(new Date(sub.subscribedAt))}
                className="tabular-nums"
              >
                {relativeTime(new Date(sub.subscribedAt))}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {sub.unsubscribedAt !== null ? (
                <ResubscribeButton id={sub.id} />
              ) : (
                <UnsubscribeButton id={sub.id} />
              )}
              <DeleteButton id={sub.id} email={sub.email} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
