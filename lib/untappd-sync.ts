/**
 * lib/untappd-sync.ts — Shared events-sync logic.
 *
 * Exports:
 *   runEventsSync()  The full fetch-map-upsert-softdelete pipeline, extracted
 *                   from the cron route so the admin "Sync now" button and the
 *                   Vercel Cron job share a single code path.
 *
 * Slug helpers are also exported so tests and any future callers can reuse them
 * without importing from the route file.
 *
 * Design decisions:
 *   - runEventsSync() performs revalidateTag('events','max') itself so BOTH
 *     callers (cron and action) get the ISR bust automatically without each
 *     having to remember to call it. This makes the function "complete" for its
 *     domain — fetch + write + bust cache.
 *   - Auth (CRON_SECRET check) and HTTP response shape remain in the cron route.
 *   - The server action adds its own revalidateTag('taps') on top (taps share
 *     a different cache key and are not touched here).
 *
 * Return shape:
 *   { ok: true;  upserted: number }
 *   { ok: false; skipped: true;  reason: string }   ← upstream fetch failed
 *   { ok: false; skipped: false; reason: string }   ← DB write failed
 */

import 'server-only';

import { revalidateTag } from 'next/cache';
import { fetchEvents } from '@/lib/untappd';
import {
  upsertEventRows,
  softDeleteMissingEvents,
} from '@/lib/db/queries/events-cache';
import { slugify } from '@/lib/slugify';
import type { NewEventCacheRow } from '@/lib/db/schema';

// ─── Slug helpers ─────────────────────────────────────────────────────────────

/**
 * Derive a stable 8-character suffix from an Untappd event id.
 *
 * Strategy: sanitise the raw id to alphanumeric-and-hyphens, then take the
 * last 8 characters (most-entropy end of a numeric or UUID-style id). Falls
 * back to a simple base-36 hash of the whole string when the id is too short.
 *
 * The suffix is appended to the slugified title so the final slug is unique
 * and human-readable even when two events share the same title.
 */
export function stableSlugSuffix(untappdEventId: string): string {
  // Strip anything that is not alphanumeric or a hyphen.
  const sanitised = untappdEventId.replace(/[^a-zA-Z0-9-]/g, '');

  if (sanitised.length >= 8) {
    return sanitised.slice(-8).toLowerCase();
  }

  // Short id: produce an 8-char base-36 hash via simple polynomial rolling hash.
  let h = 0;
  for (let i = 0; i < untappdEventId.length; i++) {
    h = (Math.imul(31, h) + untappdEventId.charCodeAt(i)) >>> 0;
  }
  return h.toString(36).padStart(8, '0').slice(-8);
}

/**
 * Build a stable, unique slug for an event.
 * Format: <slugified-title>-<8-char-suffix>
 *
 * The slug is ONLY used at insert time. The upsertEventRows helper is designed
 * to leave the slug column untouched on conflict updates, so this function is
 * never called for an already-persisted event.
 */
export function buildEventSlug(title: string, untappdEventId: string): string {
  const base = slugify(title);
  const suffix = stableSlugSuffix(untappdEventId);
  // slugify caps at 80 chars; total slug must also fit the DB unique constraint.
  // Reserve 9 chars for '-<suffix>'; cap base at 71.
  const cappedBase = base.slice(0, 71).replace(/-+$/, '');
  return `${cappedBase}-${suffix}`;
}

// ─── Sync result type ─────────────────────────────────────────────────────────

export type EventsSyncResult =
  | { ok: true; upserted: number }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

// ─── Core sync ────────────────────────────────────────────────────────────────

/**
 * runEventsSync — shared events-sync pipeline used by both the Vercel Cron
 * route and the admin "Sync now" server action.
 *
 * Steps:
 *   1. fetchEvents() — on error returns { ok:false, skipped:true } without
 *      touching the DB (preserves last-good state).
 *   2. Map UntappdEvent → NewEventCacheRow (slug built once at insert time).
 *   3. upsertEventRows() — on DB error returns { ok:false, skipped:false }.
 *   4. softDeleteMissingEvents() — non-fatal; logged on failure.
 *   5. revalidateTag('events','max') — always revalidated when upsert succeeds.
 *
 * Does NOT check CRON_SECRET (cron route's concern) and does NOT revalidateTag
 * for taps (server action's concern — taps are a separate cache entry).
 */
export async function runEventsSync(): Promise<EventsSyncResult> {
  // Step 1: fetch live events from Untappd.
  // fetchEvents() throws on any live upstream failure so we can safely treat
  // a throw as "upstream unavailable — skip this cycle."
  let liveEvents: Awaited<ReturnType<typeof fetchEvents>>;
  try {
    liveEvents = await fetchEvents();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[untappd-sync] fetchEvents failed — skipping sync cycle:', reason);
    return { ok: false, skipped: true, reason };
  }

  // Step 2: map UntappdEvent → NewEventCacheRow.
  const rows: NewEventCacheRow[] = liveEvents.map((e) => ({
    untappdEventId: e.untappdEventId,
    slug: buildEventSlug(e.title, e.untappdEventId),
    title: e.title,
    description: e.description ?? '',
    startsAt: new Date(e.startsAt),
    endsAt: e.endsAt != null ? new Date(e.endsAt) : null,
    coverImageUrl: e.coverImageUrl ?? null,
    externalUrl: e.externalUrl ?? null,
    // syncedAt, deletedAt, createdAt, updatedAt — set by upsertEventRows / DB defaults
  }));

  // Step 3: upsert rows (slug is preserved on conflict — see events-cache.ts).
  try {
    await upsertEventRows(rows);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[untappd-sync] upsertEventRows failed:', reason);
    return { ok: false, skipped: false, reason };
  }

  // Step 4: soft-delete events no longer reported by Untappd.
  // Non-fatal — upsert already succeeded; log but don't fail the sync.
  const liveUntappdIds = liveEvents.map((e) => e.untappdEventId);
  try {
    await softDeleteMissingEvents(liveUntappdIds);
  } catch (err) {
    console.error('[untappd-sync] softDeleteMissingEvents failed (non-fatal):', err);
  }

  // Step 5: bust the public ISR events cache.
  // 'max' is the Next.js 15 revalidation priority flag used consistently across this project.
  revalidateTag('events', 'max');

  return { ok: true, upserted: rows.length };
}
