/**
 * app/api/cron/sync-events/route.ts
 *
 * Scheduled cron handler: fetches events from Untappd, upserts them into
 * events_cache, soft-deletes rows that are no longer reported, and revalidates
 * the public ISR 'events' cache tag.
 *
 * Invoked every 5 minutes by Vercel Cron (see vercel.json).
 * Secured with a Bearer token that Vercel injects automatically when
 * CRON_SECRET is set in the project environment variables.
 *
 * Outage-safe: any error from fetchEvents() causes an early 200 return with
 * { ok: false, skipped: true } and leaves the DB untouched. A silent empty
 * array from the upstream would soft-delete every event, so we only proceed
 * when fetchEvents() resolves successfully with a non-empty-or-trusted list.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { revalidateTag } from 'next/cache';
import { fetchEvents } from '@/lib/untappd';
import {
  upsertEventRows,
  softDeleteMissingEvents,
} from '@/lib/db/queries/events-cache';
import { slugify } from '@/lib/slugify';
import type { NewEventCacheRow } from '@/lib/db/schema';

// ─── Slug suffix helpers ──────────────────────────────────────────────────────

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
function stableSlugSuffix(untappdEventId: string): string {
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
function buildEventSlug(title: string, untappdEventId: string): string {
  const base = slugify(title);
  const suffix = stableSlugSuffix(untappdEventId);
  // slugify caps at 80 chars; total slug must also fit the DB unique constraint.
  // Reserve 9 chars for '-<suffix>'; cap base at 71.
  const cappedBase = base.slice(0, 71).replace(/-+$/, '');
  return `${cappedBase}-${suffix}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  // ── Security: require Bearer CRON_SECRET ────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[sync-events] CRON_SECRET env var is not set — rejecting request');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (token !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Step 1: Fetch live events from Untappd ──────────────────────────────────
  // fetchEvents() throws on any live upstream failure (non-2xx, timeout, etc.)
  // so we can safely treat a throw as "upstream unavailable — skip this cycle."
  // An empty array in mock mode is legitimate; an empty array from a live fetch
  // is NOT treated as "zero events" — fetchEvents() returns the full live list
  // or throws, never silently returns [] on a real error.
  let liveEvents: Awaited<ReturnType<typeof fetchEvents>>;
  try {
    liveEvents = await fetchEvents();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[sync-events] fetchEvents failed — skipping sync cycle:', reason);
    return Response.json({ ok: false, skipped: true, reason }, { status: 200 });
  }

  // ── Step 2: Map UntappdEvent → NewEventCacheRow ─────────────────────────────
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

  // ── Step 3: Upsert rows (slug is preserved on conflict — see events-cache.ts) ─
  try {
    await upsertEventRows(rows);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[sync-events] upsertEventRows failed:', reason);
    return Response.json({ ok: false, skipped: false, reason }, { status: 200 });
  }

  // ── Step 4: Soft-delete events no longer reported by Untappd ────────────────
  // softDeleteMissingEvents is a no-op when liveEvents is empty (guards against
  // blanket-deleting the table). Resurrection on re-add is handled by upsert
  // setting deleted_at = NULL.
  const liveUntappdIds = liveEvents.map((e) => e.untappdEventId);
  try {
    await softDeleteMissingEvents(liveUntappdIds);
  } catch (err) {
    // Log but don't fail the whole sync — upsert already succeeded.
    console.error('[sync-events] softDeleteMissingEvents failed (non-fatal):', err);
  }

  // ── Step 5: Bust the public ISR events cache ─────────────────────────────────
  revalidateTag('events', 'max');

  return Response.json({ ok: true, upserted: rows.length });
}
