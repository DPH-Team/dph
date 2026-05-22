import Link from 'next/link';
import { Users, Search } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import {
  listApplications,
  getApplicationCounts,
} from '@/lib/db/queries/career-applications';
import { listPostings } from '@/lib/db/queries/career-postings';
import { listApplicationsFilterSchema } from '@/lib/validators/careers';
import { cn } from '@/lib/utils';
import { ApplicationsTable } from './ApplicationsTable';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ApplicationsPage({ searchParams }: PageProps) {
  await requireStaff();

  const rawParams = await searchParams;
  const rawFilter = {
    status: typeof rawParams.status === 'string' ? rawParams.status : undefined,
    postingId:
      typeof rawParams.postingId === 'string' ? rawParams.postingId : undefined,
    q: typeof rawParams.q === 'string' ? rawParams.q : undefined,
  };

  const parsed = listApplicationsFilterSchema.safeParse(rawFilter);
  const filter = parsed.success ? parsed.data : {};

  const [applications, counts, postings] = await Promise.all([
    listApplications({
      status: filter.status,
      postingId: filter.postingId,
      q: filter.q,
    }),
    getApplicationCounts(),
    listPostings(),
  ]);

  // Build a title lookup for the posting column
  const postingTitleMap = new Map(postings.map((p) => [p.id, p.title]));

  const applicationsWithTitle = applications.map((a) => ({
    ...a,
    postingTitle: a.postingId ? (postingTitleMap.get(a.postingId) ?? null) : null,
  }));

  const hasFilters = Boolean(
    (filter.status && filter.status !== 'all') ||
      filter.postingId ||
      (filter.q && filter.q !== ''),
  );

  const activeStatus = filter.status ?? 'all';
  const activePostingId = filter.postingId ?? '';
  const activeSearch = filter.q ?? '';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">
              Applications
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review applicant submissions. Applications are created by candidates
            via the public form.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Count pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
                counts.new > 0
                  ? 'bg-[oklch(0.648_0.130_47_/_0.18)] border-[oklch(0.648_0.130_47_/_0.5)] text-[oklch(0.80_0.08_47)]'
                  : 'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
              )}
            >
              {counts.new} new
            </span>
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-blue-500/10 border-blue-500/30 text-blue-400">
              {counts.reviewed} reviewed
            </span>
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground">
              {counts.archived} archived
            </span>
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground">
              {counts.total} total
            </span>
          </div>

          {/* Back to postings */}
          <Link
            href="/admin/careers"
            className="inline-flex h-8 items-center rounded-[var(--radius-md)] border border-border bg-[oklch(0.235_0.004_286)] px-3 text-sm font-medium text-foreground transition-colors hover:bg-[oklch(0.270_0.004_286)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            Postings
          </Link>
        </div>
      </header>

      {/* Filter row */}
      <form
        method="GET"
        action="/admin/careers/applications"
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
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Posting filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-posting"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Posting
          </label>
          <select
            id="filter-posting"
            name="postingId"
            defaultValue={activePostingId}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="">All postings</option>
            {postings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search input */}
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
              placeholder="Name or email…"
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
            href="/admin/careers/applications"
            className="h-9 inline-flex items-center rounded-[var(--radius-md)] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <ApplicationsTable
        applications={applicationsWithTitle}
        hasFilters={hasFilters}
      />
    </div>
  );
}
