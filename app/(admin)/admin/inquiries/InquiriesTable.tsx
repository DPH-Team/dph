'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import type { Inquiry } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const TYPE_LABELS: Record<string, string> = {
  reservation: 'Reservation',
  private_event: 'Private Event',
  press: 'Press',
  general: 'General',
};

// ─── Badges ───────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const colours: Record<string, string> = {
    reservation: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    private_event: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    press: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    general: 'bg-[oklch(0.235_0.004_286)] text-foreground border-border',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        colours[type] ?? colours.general,
      )}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    declined: 'bg-[oklch(0.235_0.004_286)] text-muted-foreground border-border line-through',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    declined: 'Declined',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        colours[status] ?? 'bg-[oklch(0.235_0.004_286)] text-foreground border-border',
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: Column<Inquiry>[] = [
  {
    key: 'received',
    header: 'Received',
    cell: (row) => {
      const date = new Date(row.createdAt);
      return (
        <span title={formatAbsolute(date)} className="tabular-nums">
          {relativeTime(date)}
        </span>
      );
    },
    width: 'w-28',
  },
  {
    key: 'type',
    header: 'Type',
    cell: (row) => <TypeBadge type={row.type} />,
    width: 'w-32',
  },
  {
    key: 'name',
    header: 'Name',
    cell: (row) => (
      <span className="font-medium text-foreground">{row.name}</span>
    ),
  },
  {
    key: 'contact',
    header: 'Contact',
    cell: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-foreground">{row.email}</span>
        {row.phone && (
          <span className="text-xs text-muted-foreground">{row.phone}</span>
        )}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => <StatusBadge status={row.status} />,
    width: 'w-28',
  },
  {
    key: 'preferred',
    header: 'Preferred When',
    cell: (row) => {
      if (!row.preferredDate) return <span className="text-muted-foreground">&mdash;</span>;
      const parts = [row.preferredDate];
      if (row.preferredTime) {
        const [h, m] = row.preferredTime.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        parts.push(`${hour}:${String(m).padStart(2, '0')} ${ampm}`);
      }
      return <span className="tabular-nums text-foreground">{parts.join(' ')}</span>;
    },
    width: 'w-36',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface InquiriesTableProps {
  inquiries: Inquiry[];
  hasFilters: boolean;
}

export function InquiriesTable({ inquiries, hasFilters }: InquiriesTableProps) {
  return (
    <ResourceTable<Inquiry>
      data={inquiries}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/admin/inquiries/${row.id}`}
      emptyState={
        hasFilters
          ? {
              title: 'No inquiries match these filters.',
              description: 'Try adjusting the filters or clearing them to see all inquiries.',
              action: (
                <Link
                  href="/admin/inquiries"
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters
                </Link>
              ),
            }
          : {
              title: 'No inquiries yet.',
              description:
                "When guests submit a reservation or contact form, they'll show up here.",
            }
      }
    />
  );
}
