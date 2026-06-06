import Link from 'next/link';
import { Mail, Search, Download } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import {
  listSubscribers,
  getSubscriberCounts,
} from '@/lib/db/queries/subscribers';
import {
  listSubscribersFilterSchema,
  type ListSubscribersFilterInput,
} from '@/lib/validators/newsletter';
import { cn } from '@/lib/utils';
import { SubscribersTable } from './SubscribersTable';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewsletterPage({ searchParams }: PageProps) {
  // Defense-in-depth: layout already calls requireAdmin but we call it here too.
  await requireAdmin();

  const rawParams = await searchParams;
  const rawFilter = {
    status: typeof rawParams.status === 'string' ? rawParams.status : undefined,
    search: typeof rawParams.q === 'string' ? rawParams.q : undefined,
  };

  const parsed = listSubscribersFilterSchema.safeParse(rawFilter);
  const filter: { status?: string; search?: string } = parsed.success
    ? parsed.data
    : {};

  const [list, counts] = await Promise.all([
    listSubscribers({
      status:
        filter.status && filter.status !== 'all'
          ? (filter.status as ListSubscribersFilterInput['status'])
          : undefined,
      search: filter.search,
    }),
    getSubscriberCounts(),
  ]);

  const hasFilters = Boolean(
    (filter.status && filter.status !== 'all') ||
      (filter.search && filter.search !== ''),
  );

  const activeStatus = filter.status ?? 'all';
  const activeSearch = filter.search ?? '';

  // Build export href with the same active filters so CSV reflects the list.
  const exportParams = new URLSearchParams();
  if (activeStatus !== 'all') exportParams.set('status', activeStatus);
  if (activeSearch) exportParams.set('q', activeSearch);
  const exportHref = `/admin/newsletter/export${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">Newsletter</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Subscriber list. Export to CSV for broadcast sends via the Resend dashboard.
          </p>
        </div>

        {/* Count pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
            {counts.active} active
          </span>
          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-amber-500/10 border-amber-500/30 text-amber-400">
            {counts.pending} pending
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
              'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
            )}
          >
            {counts.unsubscribed} unsubscribed
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
              'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
            )}
          >
            {counts.total} total
          </span>
        </div>
      </header>

      {/* Filter row — plain GET form, no JS required */}
      <form
        method="GET"
        action="/admin/newsletter"
        className="flex flex-wrap items-end gap-3"
      >
        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-status"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Status
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={activeStatus}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </div>

        {/* Email search */}
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label
            htmlFor="filter-search"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
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
              placeholder="Email address..."
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
            href="/admin/newsletter"
            className="h-9 inline-flex items-center rounded-[var(--radius-md)] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </Link>
        )}

        {/* Export CSV button — carries the active filters */}
        <a
          href={exportHref}
          download
          className="h-9 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-[oklch(0.235_0.004_286)] px-4 text-sm font-medium text-foreground transition-colors hover:bg-[oklch(0.270_0.004_286)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Export CSV
        </a>
      </form>

      {/* Subscriber table */}
      <SubscribersTable subscribers={list} hasFilters={hasFilters} />
    </div>
  );
}
