import Link from 'next/link';
import { Inbox, Search } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import {
  listInquiries,
  getInquiryCounts,
} from '@/lib/db/queries/inquiries';
import {
  listInquiriesFilterSchema,
  INQUIRY_TYPES,
  INQUIRY_STATUSES,
} from '@/lib/validators/inquiries';
import { ResourceTable } from '@/components/admin/ResourceTable';
import type { Column } from '@/components/admin/ResourceTable';
import type { Inquiry } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Table columns ────────────────────────────────────────────────────────────

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
        // Format time as e.g. "3:00 PM"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InquiriesPage({ searchParams }: PageProps) {
  await requireStaff();

  const rawParams = await searchParams;
  const rawFilter = {
    type: typeof rawParams.type === 'string' ? rawParams.type : undefined,
    status: typeof rawParams.status === 'string' ? rawParams.status : undefined,
    search: typeof rawParams.q === 'string' ? rawParams.q : undefined,
  };

  const parsed = listInquiriesFilterSchema.safeParse(rawFilter);
  const filter = parsed.success ? parsed.data : {};

  const [inquiriesList, counts] = await Promise.all([
    listInquiries({
      type: filter.type !== 'all' ? filter.type : undefined,
      status: filter.status !== 'all' ? filter.status : undefined,
      search: filter.search,
    }),
    getInquiryCounts(),
  ]);

  const hasFilters =
    (filter.type && filter.type !== 'all') ||
    (filter.status && filter.status !== 'all') ||
    (filter.search && filter.search !== '');

  const activeType = filter.type ?? 'all';
  const activeStatus = filter.status ?? 'all';
  const activeSearch = filter.search ?? '';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">Inquiries</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reservation requests, private events, and contact messages from guests.
          </p>
        </div>

        {/* Count pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
              counts.pending > 0
                ? 'bg-[oklch(0.648_0.130_47_/_0.18)] border-[oklch(0.648_0.130_47_/_0.5)] text-[oklch(0.80_0.08_47)]'
                : 'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
            )}
          >
            {counts.pending} pending
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            {counts.confirmed} confirmed
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground">
            {counts.declined} declined
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground">
            {counts.total} total
          </span>
        </div>
      </header>

      {/* Filter row — plain GET form, no JS required */}
      <form
        method="GET"
        action="/admin/inquiries"
        className="flex flex-wrap items-end gap-3"
      >
        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-status" className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={activeStatus}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="all">All</option>
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Type filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-type" className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Type
          </label>
          <select
            id="filter-type"
            name="type"
            defaultValue={activeType}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="all">All Types</option>
            {INQUIRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label htmlFor="filter-search" className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Search
          </label>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="filter-search"
              name="q"
              type="search"
              defaultValue={activeSearch}
              placeholder="Name, email, or message…"
              className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-input pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            />
          </div>
        </div>

        <button
          type="submit"
          className="h-9 rounded-[var(--radius-md)] border border-border bg-[oklch(0.235_0.004_286)] px-4 text-sm font-medium text-foreground transition-colors hover:bg-[oklch(0.270_0.004_286)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        >
          Filter
        </button>

        {hasFilters && (
          <Link
            href="/admin/inquiries"
            className="h-9 inline-flex items-center rounded-[var(--radius-md)] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <ResourceTable<Inquiry>
        data={inquiriesList}
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
                description: 'When guests submit a reservation or contact form, they\'ll show up here.',
              }
        }
      />
    </div>
  );
}
