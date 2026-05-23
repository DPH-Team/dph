'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import type { CareerPosting } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        isOpen
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          : 'bg-[oklch(0.235_0.004_286)] text-muted-foreground border-border',
      )}
    >
      {isOpen ? 'Open' : 'Closed'}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const label = type === 'full_time' ? 'Full-time' : 'Part-time';
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-[oklch(0.235_0.004_286)] text-foreground border-border">
      {label}
    </span>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: Column<CareerPosting>[] = [
  {
    key: 'title',
    header: 'Title',
    cell: (row) => (
      <span className="font-medium text-foreground">{row.title}</span>
    ),
  },
  {
    key: 'department',
    header: 'Department',
    cell: (row) => (
      <span className="text-muted-foreground">{row.department}</span>
    ),
    width: 'w-36',
  },
  {
    key: 'type',
    header: 'Type',
    cell: (row) => <TypeBadge type={row.type} />,
    width: 'w-28',
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => <StatusBadge isOpen={row.isOpen} />,
    width: 'w-24',
  },
  {
    key: 'sortOrder',
    header: 'Order',
    cell: (row) => (
      <span className="tabular-nums text-muted-foreground">{row.sortOrder}</span>
    ),
    width: 'w-16',
    align: 'right',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface PostingsTableProps {
  postings: CareerPosting[];
  hasFilters: boolean;
}

export function PostingsTable({ postings, hasFilters }: PostingsTableProps) {
  return (
    <ResourceTable<CareerPosting>
      data={postings}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/admin/careers/postings/${row.id}`}
      emptyState={
        hasFilters
          ? {
              title: 'No postings match these filters.',
              description:
                'Try adjusting the filters or clearing them to see all postings.',
              action: (
                <Link
                  href="/admin/careers"
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters
                </Link>
              ),
            }
          : {
              title: 'No postings yet.',
              description:
                "Create your first job posting to start accepting applications.",
              action: (
                <Link
                  href="/admin/careers/postings/new"
                  className="text-sm text-primary hover:underline"
                >
                  Create a posting
                </Link>
              ),
            }
      }
    />
  );
}
