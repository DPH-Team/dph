import Link from 'next/link';
import { ScrollText } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import {
  listAuditLog,
  getDistinctActions,
  getDistinctEntityTypes,
  PAGE_SIZE,
} from '@/lib/db/queries/audit-log';
import { listAuditFilterSchema } from '@/lib/validators/audit-log';
import { Button } from '@/components/ui/button';
import { ActivityTable } from '@/components/admin/ActivityTable';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ─── Pagination URL builder ────────────────────────────────────────────────────

/**
 * Build a pagination URL that carries all active filter params forward.
 * Merges the current search params with the new page number.
 */
function buildPageUrl(
  rawParams: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();

  // Carry all scalar string filter params forward (skip page — we set it ourselves)
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === 'page') continue;
    if (typeof value === 'string' && value !== '') {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const qs = params.toString();
  return `/admin/activity${qs ? `?${qs}` : ''}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// If distinct action or entity-type lists exceed this threshold, fall back to
// a plain text input — a dropdown with 100+ options is not friendly.
const DISTINCT_DROPDOWN_MAX = 100;

export default async function ActivityPage({ searchParams }: PageProps) {
  await requireStaff();

  const rawParams = await searchParams;

  // Extract raw scalar values from searchParams
  const rawFilter = {
    actor:
      typeof rawParams.actor === 'string' ? rawParams.actor : undefined,
    action:
      typeof rawParams.action === 'string' ? rawParams.action : undefined,
    entityType:
      typeof rawParams.entityType === 'string'
        ? rawParams.entityType
        : undefined,
    from:
      typeof rawParams.from === 'string' ? rawParams.from : undefined,
    to: typeof rawParams.to === 'string' ? rawParams.to : undefined,
    page:
      typeof rawParams.page === 'string' ? rawParams.page : undefined,
  };

  // Validate — fall back to empty filter on bad input (don't 500)
  const parsed = listAuditFilterSchema.safeParse(rawFilter);
  const filter = parsed.success ? parsed.data : {};
  const page = filter.page ?? 1;

  // Fetch page data, total count, and distinct-value lists in parallel
  const [{ entries, total }, distinctActions, distinctEntityTypes] =
    await Promise.all([
      listAuditLog(filter, page),
      getDistinctActions(),
      getDistinctEntityTypes(),
    ]);

  const hasFilters = Boolean(
    filter.actor ||
      filter.action ||
      filter.entityType ||
      filter.from ||
      filter.to,
  );

  const hasPrev = page > 1;
  const hasNext = entries.length === PAGE_SIZE;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Active filter values for controlled form inputs
  const activeActor = filter.actor ?? '';
  const activeAction = filter.action ?? '';
  const activeEntityType = filter.entityType ?? '';
  const activeFrom = filter.from ?? '';
  const activeTo = filter.to ?? '';

  // Use dropdowns only when the option count is manageable
  const useActionDropdown = distinctActions.length <= DISTINCT_DROPDOWN_MAX;
  const useEntityTypeDropdown =
    distinctEntityTypes.length <= DISTINCT_DROPDOWN_MAX;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <h1 className="text-xl font-semibold text-foreground">
              Activity Log
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every action your team takes — logins, edits, deletes — lands here.
            Read-only. No surprises.
          </p>
        </div>

        {/* Result count chip */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasFilters ? (
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground">
              {entries.length.toLocaleString()} of {total.toLocaleString()}{' '}
              entries
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground">
              {total.toLocaleString()} entries
            </span>
          )}
        </div>
      </header>

      {/* Filter row — plain GET form, no JS required */}
      <form
        method="GET"
        action="/admin/activity"
        className="flex flex-wrap items-end gap-3"
      >
        {/* Actor email filter */}
        <div className="flex flex-col gap-1 min-w-48 flex-1">
          <label
            htmlFor="filter-actor"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Actor
          </label>
          <input
            id="filter-actor"
            name="actor"
            type="text"
            defaultValue={activeActor}
            placeholder="Email address…"
            className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          />
        </div>

        {/* Action filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-action"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Action
          </label>
          {useActionDropdown ? (
            <select
              id="filter-action"
              name="action"
              defaultValue={activeAction}
              className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <option value="">All actions</option>
              {distinctActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="filter-action"
              name="action"
              type="text"
              defaultValue={activeAction}
              placeholder="e.g. event.create"
              className="h-9 w-40 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            />
          )}
        </div>

        {/* Entity type filter */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-entity-type"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            Entity
          </label>
          {useEntityTypeDropdown ? (
            <select
              id="filter-entity-type"
              name="entityType"
              defaultValue={activeEntityType}
              className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <option value="">All entities</option>
              {distinctEntityTypes.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="filter-entity-type"
              name="entityType"
              type="text"
              defaultValue={activeEntityType}
              placeholder="e.g. event"
              className="h-9 w-36 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            />
          )}
        </div>

        {/* From date */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-from"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            From
          </label>
          <input
            id="filter-from"
            name="from"
            type="date"
            defaultValue={activeFrom}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          />
        </div>

        {/* To date */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="filter-to"
            className="text-xs text-muted-foreground font-medium uppercase tracking-wide"
          >
            To
          </label>
          <input
            id="filter-to"
            name="to"
            type="date"
            defaultValue={activeTo}
            className="h-9 rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          />
        </div>

        <button
          type="submit"
          className="h-9 rounded-[var(--radius-md)] border border-border bg-[oklch(0.235_0.004_286)] px-4 text-sm font-medium text-foreground transition-colors hover:bg-[oklch(0.270_0.004_286)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        >
          Filter
        </button>

        {hasFilters && (
          <Link
            href="/admin/activity"
            className="h-9 inline-flex items-center rounded-[var(--radius-md)] px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2" aria-label="Active filters">
          {filter.actor && (
            <FilterChip
              label={`Actor: ${filter.actor}`}
              removeHref={buildDropParamUrl(rawParams, 'actor')}
            />
          )}
          {filter.action && (
            <FilterChip
              label={`Action: ${filter.action}`}
              removeHref={buildDropParamUrl(rawParams, 'action')}
            />
          )}
          {filter.entityType && (
            <FilterChip
              label={`Entity: ${filter.entityType}`}
              removeHref={buildDropParamUrl(rawParams, 'entityType')}
            />
          )}
          {filter.from && (
            <FilterChip
              label={`From: ${filter.from}`}
              removeHref={buildDropParamUrl(rawParams, 'from')}
            />
          )}
          {filter.to && (
            <FilterChip
              label={`To: ${filter.to}`}
              removeHref={buildDropParamUrl(rawParams, 'to')}
            />
          )}
        </div>
      )}

      {/* Table */}
      <ActivityTable entries={entries} hasFilters={hasFilters} />

      {/* Pagination */}
      {(entries.length > 0 || page > 1) && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            render={
              hasPrev ? (
                <Link href={buildPageUrl(rawParams, page - 1)} />
              ) : undefined
            }
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Prev
          </Button>

          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page}
            {total > 0 && (
              <>
                {' · '}
                Showing{' '}
                {Math.min(
                  (page - 1) * PAGE_SIZE + 1,
                  total,
                ).toLocaleString()}
                –
                {Math.min(page * PAGE_SIZE, total).toLocaleString()} of{' '}
                {total.toLocaleString()}
              </>
            )}
            {totalPages > 1 && ` · ${totalPages} pages`}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            render={
              hasNext ? (
                <Link href={buildPageUrl(rawParams, page + 1)} />
              ) : undefined
            }
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── FilterChip ────────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  removeHref: string;
}

function FilterChip({ label, removeHref }: FilterChipProps) {
  return (
    <Link
      href={removeHref}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
      aria-label={`Remove filter: ${label}`}
    >
      {label}
      <span aria-hidden="true" className="text-muted-foreground/60">
        &times;
      </span>
    </Link>
  );
}

// ─── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Build a URL with one param removed (for filter chip removal).
 * Drops page param too so the user starts at page 1 after removing a filter.
 */
function buildDropParamUrl(
  rawParams: Record<string, string | string[] | undefined>,
  dropKey: string,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(rawParams)) {
    if (key === 'page') continue; // reset to page 1
    if (key === dropKey) continue; // drop the removed filter
    if (typeof value === 'string' && value !== '') {
      params.set(key, value);
    }
  }

  const qs = params.toString();
  return `/admin/activity${qs ? `?${qs}` : ''}`;
}
