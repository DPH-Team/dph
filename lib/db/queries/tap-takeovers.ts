import 'server-only';

import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tapTakeovers } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { todayInVenueDate } from '@/lib/datetime';
import { getUntappdFeaturedBrewery } from '@/lib/db/queries/integrations';
import type { TapTakeover } from '@/lib/db/schema';

// ─── Error types ──────────────────────────────────────────────────────────────

/**
 * Thrown by createTakeover when the Postgres unique_violation (23505) fires on
 * the `date` column — i.e. a takeover is already scheduled for the requested
 * date. The action layer catches this and surfaces a friendly field error on
 * `date`.
 */
export class TakeoverDateConflictError extends Error {
  constructor(date: string) {
    super(`A takeover is already scheduled for that date (${date}).`);
    this.name = 'TakeoverDateConflictError';
  }
}

// ─── PG unique violation error code ──────────────────────────────────────────

const PG_UNIQUE_VIOLATION = '23505';

// ─── Session-client CRUD (RLS-respecting, for the admin UI) ──────────────────

/**
 * Return all tap takeover rows ordered by date ascending.
 */
export async function listTakeovers(): Promise<TapTakeover[]> {
  return db.select().from(tapTakeovers).orderBy(asc(tapTakeovers.date));
}

/**
 * Get a single tap takeover row by id. Returns null if not found.
 * Used for fetching the before-state for audit logging prior to deletion.
 */
export async function getTakeoverById(
  id: string,
): Promise<TapTakeover | null> {
  const rows = await db
    .select()
    .from(tapTakeovers)
    .where(eq(tapTakeovers.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Insert a new scheduled tap takeover. Returns the created row.
 *
 * Stamps createdBy and updatedBy with actorId.
 * Throws TakeoverDateConflictError if a row already exists for the same date
 * so the action layer can surface a friendly field error.
 */
export async function createTakeover(
  input: { brewery: string; date: string },
  actorId: string,
): Promise<TapTakeover> {
  try {
    const rows = await db
      .insert(tapTakeovers)
      .values({
        brewery: input.brewery,
        date: input.date,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error('createTakeover: insert returned no rows');
    }
    return row;
  } catch (err: unknown) {
    const pgCode =
      err != null && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : null;
    if (pgCode === PG_UNIQUE_VIOLATION) {
      throw new TakeoverDateConflictError(input.date);
    }
    throw err;
  }
}

/**
 * Hard-delete a scheduled tap takeover by id. Returns the deleted row.
 * Throws if no row matched (guards against double-delete races).
 *
 * actorId is accepted (and forwarded to the audit log at the action layer) but
 * is not written to the DB here — the row is deleted rather than updated, so
 * there is no column to stamp it on.
 */
export async function deleteTakeover(
  id: string,
  actorId: string,
): Promise<TapTakeover> {
  // actorId is used by the action layer for audit logging; not written to DB.
  void actorId;

  const rows = await db
    .delete(tapTakeovers)
    .where(eq(tapTakeovers.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`deleteTakeover: no takeover found with id ${id}`);
  }
  return row;
}

// ─── Resolver helpers (service-role, safe for public read path) ───────────────

/**
 * Return the brewery name scheduled for today in the venue-local timezone, or
 * null when no takeover is scheduled for today.
 *
 * Uses the service-role admin client so it bypasses RLS and is safe to call
 * from public server components / the tap-list render path where there is no
 * active user session.
 *
 * Never throws — any DB or network error returns null so the caller can fall
 * back gracefully.
 */
export async function getScheduledTakeoverForToday(): Promise<string | null> {
  try {
    const today = todayInVenueDate();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('tap_takeovers')
      .select('brewery')
      .eq('date', today)
      .single();

    if (error || !data) return null;

    const val = data.brewery;
    return typeof val === 'string' && val.trim() !== '' ? val.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the active featured brewery for the tap-takeover overlay.
 *
 * Precedence:
 *   1. A row in `tap_takeovers` for today's venue-local date → use that brewery.
 *   2. Otherwise fall back to `config.featured_brewery` on the untappd
 *      integration row (the existing manual selection).
 *
 * Wraps both reads in a top-level try/catch so any unexpected error returns
 * null rather than surfacing to the public page. This is the single resolver
 * the tap-list overlay calls.
 */
export async function getActiveTakeoverBrewery(): Promise<string | null> {
  try {
    return (await getScheduledTakeoverForToday()) ?? (await getUntappdFeaturedBrewery());
  } catch {
    return null;
  }
}
