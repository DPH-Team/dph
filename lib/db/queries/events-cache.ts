/**
 * lib/db/queries/events-cache.ts — DB helpers for the events_cache table.
 *
 * Public read functions use the user-session Drizzle client (`db`) so RLS
 * applies (select policy: deleted_at IS NULL).
 *
 * Write helpers (upsertEventRows, softDeleteMissingEvents) use the service-role
 * admin client via createAdminClient() because there is no write RLS policy —
 * all mutations are performed by the cron sync task, not by authenticated users.
 */

import 'server-only';

import { isNull, desc, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { eventsCache } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EventCacheRow, NewEventCacheRow } from '@/lib/db/schema';

// ─── Public read helpers ──────────────────────────────────────────────────────

/**
 * Return all non-deleted upcoming events (coalesce(ends_at, starts_at) >= now()),
 * sorted ascending by starts_at.
 */
export async function listUpcomingEventRows(): Promise<EventCacheRow[]> {
  return db
    .select()
    .from(eventsCache)
    .where(
      sql`${eventsCache.deletedAt} IS NULL AND coalesce(${eventsCache.endsAt}, ${eventsCache.startsAt}) >= now()`,
    )
    .orderBy(asc(eventsCache.startsAt));
}

/**
 * Return all non-deleted past events (coalesce(ends_at, starts_at) < now()),
 * sorted descending by starts_at (most recent first).
 */
export async function listPastEventRows(): Promise<EventCacheRow[]> {
  return db
    .select()
    .from(eventsCache)
    .where(
      sql`${eventsCache.deletedAt} IS NULL AND coalesce(${eventsCache.endsAt}, ${eventsCache.startsAt}) < now()`,
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
 * - upcomingCount: count of non-deleted rows where coalesce(ends_at, starts_at) >= now().
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
      sql`${eventsCache.deletedAt} IS NULL AND coalesce(${eventsCache.endsAt}, ${eventsCache.startsAt}) >= now()`,
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

// ─── Write helpers (service-role, called by cron — not by user sessions) ──────

/**
 * Upsert a batch of event rows from the Untappd sync.
 *
 * Uses INSERT … ON CONFLICT (untappd_event_id) DO UPDATE so rows that already
 * exist are refreshed in-place. Sets synced_at = now() and clears deleted_at so
 * previously soft-deleted events resurface if Untappd reports them again.
 *
 * MUST use the service-role admin client — RLS has no write policy on this table.
 */
export async function upsertEventRows(rows: NewEventCacheRow[]): Promise<void> {
  if (rows.length === 0) return;

  const admin = createAdminClient();

  const records = rows.map((r) => ({
    untappd_event_id: r.untappdEventId,
    slug: r.slug,
    title: r.title,
    description: r.description ?? '',
    starts_at: r.startsAt instanceof Date ? r.startsAt.toISOString() : r.startsAt,
    ends_at:
      r.endsAt instanceof Date
        ? r.endsAt.toISOString()
        : (r.endsAt ?? null),
    cover_image_url: r.coverImageUrl ?? null,
    external_url: r.externalUrl ?? null,
    synced_at: new Date().toISOString(),
    deleted_at: null,
  }));

  const { error } = await admin
    .from('events_cache')
    .upsert(records, {
      onConflict: 'untappd_event_id',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`upsertEventRows failed: ${error.message}`);
  }
}

/**
 * Soft-delete events that are no longer reported by Untappd.
 *
 * Sets deleted_at = now() on all rows where untappd_event_id is NOT in the
 * provided list and deleted_at IS NULL. Skips the query entirely when
 * liveUntappdIds is empty to avoid generating an invalid NOT IN () clause.
 *
 * MUST use the service-role admin client — RLS has no write policy on this table.
 */
export async function softDeleteMissingEvents(
  liveUntappdIds: string[],
): Promise<void> {
  // Guard: if the live list is empty we refuse to delete everything — the caller
  // should treat an empty response as a fetch error, not a "no events" signal.
  if (liveUntappdIds.length === 0) return;

  const admin = createAdminClient();

  const { error } = await admin
    .from('events_cache')
    .update({ deleted_at: new Date().toISOString() })
    .not('untappd_event_id', 'in', `(${liveUntappdIds.map((id) => `"${id}"`).join(',')})`)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`softDeleteMissingEvents failed: ${error.message}`);
  }
}
