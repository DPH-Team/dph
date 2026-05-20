'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HoursOverride } from '@/lib/db/schema';
import { VENUE_TZ } from '@/lib/datetime';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatOverrideDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

function fmt(t: string): string {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  const period = h >= 12 && h !== 24 ? 'PM' : 'AM';
  const displayH = h === 0 || h === 24 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${displayH} ${period}`
    : `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function formatHourRange(open: string, close: string): string {
  const closeLabel = close.startsWith('00:00') ? 'Midnight' : fmt(close);
  return `${fmt(open)} – ${closeLabel}`;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: Column<HoursOverride>[] = [
  {
    key: 'date',
    header: 'Date',
    cell: (row) => (
      <span className="font-medium text-foreground tabular-nums">
        {formatOverrideDate(row.date)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-48',
    cell: (row) =>
      row.closed ? (
        <Badge variant="destructive">Closed</Badge>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Open</Badge>
          {row.openTime && row.closeTime && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatHourRange(row.openTime, row.closeTime)}
            </span>
          )}
        </div>
      ),
  },
  {
    key: 'note',
    header: 'Note',
    cell: (row) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {row.note ?? '—'}
      </span>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface OverridesTableProps {
  overrides: HoursOverride[];
}

export function OverridesTable({ overrides }: OverridesTableProps) {
  const newOverrideButton = (
    <Button
      size="sm"
      nativeButton={false}
      render={<Link href="/admin/hours/new" />}
    >
      + New override
    </Button>
  );

  return (
    <ResourceTable
      data={overrides}
      columns={columns}
      rowKey={(row) => row.id}
      rowHref={(row) => `/admin/hours/${row.id}`}
      emptyState={{
        title: 'No overrides yet.',
        description:
          'Hours overrides let you flag holidays, early closes, and one-off events on top of the weekly schedule.',
        action: newOverrideButton,
      }}
    />
  );
}
