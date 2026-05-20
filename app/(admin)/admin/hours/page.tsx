import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listHoursOverrides } from '@/lib/db/queries/hours-overrides';
import { VENUE_TZ } from '@/lib/datetime';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HoursOverride } from '@/lib/db/schema';

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format a date string (YYYY-MM-DD) as "Mon, Jun 15, 2026" in venue local TZ.
 * We construct noon-UTC to avoid same-day TZ shift.
 */
function formatOverrideDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

/**
 * Format a 24h time string (HH:MM or HH:MM:SS) as "5 PM", "5:30 PM",
 * or "Midnight" for 00:00.
 * Matches the formatHourRange logic in HoursCard.tsx.
 */
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HoursPage() {
  await requireStaff();

  const overrides = await listHoursOverrides();

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
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Hours</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Date-keyed overrides that replace the weekly schedule for a single
            day — closures, early closes, holiday hours.
          </p>
        </div>
        {newOverrideButton}
      </header>

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
    </div>
  );
}
