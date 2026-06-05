/**
 * lib/db/queries/events-cache.ts — DB helpers for the events_cache table.
 *
 * Public read functions use the Drizzle `db` client so RLS applies
 * (select policy: deleted_at IS NULL).
 *
 * Write helpers (upsertEventRows, softDeleteMissingEvents) also use the Drizzle
 * `db` client, which connects directly to Postgres via DATABASE_URL (the pooler
 * `postgres` role). That role owns the tables and therefore bypasses RLS — the
 * same pattern every other query module in this project uses. events_cache has
 * no write RLS policy, and these helpers are server-only, invoked exclusively
 * by the events sync cron route.
 *
 * upsertEventRows deliberately omits `slug` from the ON CONFLICT DO UPDATE set
 * so that deep-link slugs stay stable across sync cycles even if the event
 * title changes on Untappd.
 */

import 'server-only';

import { isNull, notInArray, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { eventsCache } from '@/lib/db/schema';
import type { EventCacheRow, NewEventCacheRow } from '@/lib/db/schema';

// ─── Public read helpers ──────────────────────────────────────────────────────

/**
 * Return all non-deleted upcoming events, sorted ascending by starts_at.
 *
 * "Upcoming" is day-based in venue local time (America/Chicago): an event
 * stays in this bucket through the entire calendar day it occurs on, and only
 * moves to past once that venue-local day is fully over.
 *
 * SQL predicate:
 *   coalesce(ends_at, starts_at) >= date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'
 *
 * The inner expression converts now() to venue local time, truncates to
 * midnight, then the outer AT TIME ZONE 'America/Chicago' converts that
 * venue-local midnight back to a timestamptz boundary — which is what
 * starts_at/ends_at (both timestamptz) are compared against.
 */
export async function listUpcomingEventRows(): Promise<EventCacheRow[]> {
  return db
    .select()
    .from(eventsCache)
    .where(
      sql`${eventsCache.deletedAt} IS NULL AND coalesce(${eventsCache.endsAt}, ${eventsCache.startsAt}) >= date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'`,
    )
    .orderBy(asc(eventsCache.startsAt));
}

/**
 * Return all non-deleted past events, sorted descending by starts_at (most
 * recent first).
 *
 * "Past" is the exact complement of listUpcomingEventRows — an event is past
 * only once its entire venue-local calendar day is over. An event happening
 * today is NEVER in the past bucket.
 *
 * SQL predicate:
 *   coalesce(ends_at, starts_at) < date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'
 */
export async function listPastEventRows(): Promise<EventCacheRow[]> {
  return db
    .select()
    .from(eventsCache)
    .where(
      sql`${eventsCache.deletedAt} IS NULL AND coalesce(${eventsCache.endsAt}, ${eventsCache.startsAt}) < date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'`,
    )
    .orderBy(desc(eventsCache.startsAt));
}

/**
 * Return a single non-deleted event by slug. Returns null if not found.
 */
export async function getEventRowBySlug(
  slug: string,
): Promise<EventCacheRow | null> {
  const rows = await db
    .select()
    .from(eventsCache)
    .where(
      sql`${eventsCache.deletedAt} IS NULL AND ${eventsCache.slug} = ${slug}`,
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Return all slugs for non-deleted events. Used by generateStaticParams.
 */
export async function listEventSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: eventsCache.slug })
    .from(eventsCache)
    .where(isNull(eventsCache.deletedAt));
  return rows.map((r) => r.slug);
}

// ─── Sync status ──────────────────────────────────────────────────────────────

export interface EventsSyncStatus {
  lastSyncedAt: string | null;
  upcomingCount: number;
}

/**
 * Return aggregate sync status:
 * - lastSyncedAt: ISO string of MAX(synced_at) across non-deleted rows, or null.
 * - upcomingCount: count of non-deleted rows that are upcoming using the same
 *   day-based venue TZ predicate as listUpcomingEventRows, so admin counts
 *   stay consistent with what the public pages show.
 *
 * Used by the admin dashboard card and the public "Last updated…" line.
 */
export async function getEventsSyncStatus(): Promise<EventsSyncStatus> {
  const result = await db
    .select({
      lastSyncedAt: sql<string | null>`max(${eventsCache.syncedAt})::text`,
      upcomingCount: sql<number>`count(*)::int`,
    })
    .from(eventsCache)
    .where(
      sql`${eventsCache.deletedAt} IS NULL AND coalesce(${eventsCache.endsAt}, ${eventsCache.startsAt}) >= date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'`,
    );

  const row = result[0];

  // When the table is empty the aggregate still returns one row with nulls.
  if (!row) {
    return { lastSyncedAt: null, upcomingCount: 0 };
  }

  // Fetch max(synced_at) over ALL non-deleted rows (not just upcoming).
  const syncedResult = await db
    .select({
      lastSyncedAt: sql<string | null>`max(${eventsCache.syncedAt})::text`,
    })
    .from(eventsCache)
    .where(isNull(eventsCache.deletedAt));

  return {
    lastSyncedAt: syncedResult[0]?.lastSyncedAt ?? null,
    upcomingCount: row.upcomingCount ?? 0,
  };
}

// ─── Write helpers (db client / postgres role, called by cron — not by user sessions) ──────

/**
 * Upsert a batch of event rows from the Untappd sync.
 *
 * Uses INSERT … ON CONFLICT (untappd_event_id) DO UPDATE so rows that already
 * exist are refreshed in-place. Sets synced_at = now() and clears deleted_at so
 * previously soft-deleted events resurface if Untappd reports them again.
 *
 * SLUG STABILITY: slug is intentionally excluded from the DO UPDATE set.
 * Slugs are generated once at first insert and never recomputed, so deep-links
 * remain stable across sync cycles even if the event title changes on Untappd.
 *
 * Uses the Drizzle `db` client (DATABASE_URL / postgres role) which bypasses
 * RLS as the table owner — no service-role client needed.
 */
export async function upsertEventRows(rows: NewEventCacheRow[]): Promise<void> {
  if (rows.length === 0) return;

  const now = new Date();

  const records = rows.map((r) => ({
    untappdEventId: r.untappdEventId,
    slug: r.slug,
    title: r.title,
    description: r.description ?? '',
    startsAt: r.startsAt instanceof Date ? r.startsAt : new Date(r.startsAt as string),
    endsAt:
      r.endsAt == null
        ? null
        : r.endsAt instanceof Date
          ? r.endsAt
          : new Date(r.endsAt as string),
    coverImageUrl: r.coverImageUrl ?? null,
    externalUrl: r.externalUrl ?? null,
    syncedAt: now,
    deletedAt: null,
    updatedAt: now,
  }));

  await db
    .insert(eventsCache)
    .values(records)
    .onConflictDoUpdate({
      target: eventsCache.untappdEventId,
      // slug is intentionally absent — never overwrite an existing slug.
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        startsAt: sql`excluded.starts_at`,
        endsAt: sql`excluded.ends_at`,
        coverImageUrl: sql`excluded.cover_image_url`,
        externalUrl: sql`excluded.external_url`,
        syncedAt: sql`excluded.synced_at`,
        deletedAt: sql`excluded.deleted_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

/**
 * Soft-delete events that are no longer reported by Untappd.
 *
 * Sets deleted_at = now() (and updated_at = now()) on all rows where
 * untappd_event_id is NOT IN the provided list and deleted_at IS NULL.
 * Skips the query entirely when liveUntappdIds is empty to avoid wiping
 * the whole table — the caller should treat an empty response as a fetch
 * error, not a "no events" signal.
 *
 * Uses the Drizzle `db` client (DATABASE_URL / postgres role) — same as
 * upsertEventRows. No service-role client needed.
 */
export async function softDeleteMissingEvents(
  liveUntappdIds: string[],
): Promise<void> {
  // Guard: if the live list is empty we refuse to delete everything — the caller
  // should treat an empty response as a fetch error, not a "no events" signal.
  if (liveUntappdIds.length === 0) return;

  const now = new Date();

  await db
    .update(eventsCache)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      sql`${notInArray(eventsCache.untappdEventId, liveUntappdIds)} AND ${isNull(eventsCache.deletedAt)}`,
    );
}
