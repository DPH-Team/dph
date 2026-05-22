'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import type { CareerApplication } from '@/lib/db/schema';
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    new: 'bg-[oklch(0.648_0.130_47_/_0.18)] border-[oklch(0.648_0.130_47_/_0.5)] text-[oklch(0.80_0.08_47)]',
    reviewed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    archived:
      'bg-[oklch(0.235_0.004_286)] text-muted-foreground border-border',
  };
  const labels: Record<string, string> = {
    new: 'New',
    reviewed: 'Reviewed',
    archived: 'Archived',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        colours[status] ??
          'bg-[oklch(0.235_0.004_286)] text-foreground border-border',
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

type ApplicationRow = CareerApplication & { postingTitle?: string | null };

const columns: Column<ApplicationRow>[] = [
  {
    key: 'received',
    header: 'Received',
    cell: (row) => {
      const date = new Date(row.createdAt);
      return (
        <span
          title={date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          className="tabular-nums"
        >
          {relativeTime(date)}
        </span>
      );
    },
    width: 'w-28',
  },
  {
    key: 'name',
    header: 'Applicant',
    cell: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground">{row.name}</span>
        <span className="text-xs text-muted-foreground">{row.email}</span>
      </div>
    ),
  },
  {
    key: 'posting',
    header: 'Posting',
    cell: (row) =>
      row.postingTitle ? (
        <span className="text-foreground">{row.postingTitle}</span>
      ) : (
        <span className="text-muted-foreground italic">Posting deleted</span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => <StatusBadge status={row.status} />,
    width: 'w-28',
  },
  {
    key: 'resume',
    header: 'Resume',
    cell: (row) => (
      <span
        className={cn(
          'text-xs',
          row.resumePath ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {row.resumePath ? 'Attached' : 'None'}
      </span>
    ),
    width: 'w-20',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ApplicationsTableProps {
  applications: ApplicationRow[];
  hasFilters: boolean;
}

export function ApplicationsTable({
  applications,
  hasFilters,
}: ApplicationsTableProps) {
  return (
    <ResourceTable<ApplicationRow>
      data={applications}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/admin/careers/applications/${row.id}`}
      emptyState={
        hasFilters
          ? {
              title: 'No applications match these filters.',
              description:
                'Try adjusting the filters or clearing them to see all applications.',
              action: (
                <Link
                  href="/admin/careers/applications"
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters
                </Link>
              ),
            }
          : {
              title: 'No applications yet.',
              description:
                'Applications submitted via the public careers form will appear here.',
            }
      }
    />
  );
}
