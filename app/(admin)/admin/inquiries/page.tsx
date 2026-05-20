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
import { cn } from '@/lib/utils';
import { InquiriesTable } from './InquiriesTable';

const TYPE_LABELS: Record<string, string> = {
  reservation: 'Reservation',
  private_event: 'Private Event',
  press: 'Press',
  general: 'General',
};

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

  const hasFilters = Boolean(
    (filter.type && filter.type !== 'all') ||
      (filter.status && filter.status !== 'all') ||
      (filter.search && filter.search !== ''),
  );

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
      <InquiriesTable inquiries={inquiriesList} hasFilters={hasFilters} />
    </div>
  );
}
