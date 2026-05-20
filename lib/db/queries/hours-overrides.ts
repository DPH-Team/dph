import 'server-only';

import { eq, asc, gte, lte, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { hoursOverrides } from '@/lib/db/schema';
import type { HoursOverride, NewHoursOverride } from '@/lib/db/schema';

// ─── Error types ──────────────────────────────────────────────────────────────

/**
 * Thrown by createHoursOverride / updateHoursOverride when the Postgres
 * unique_violation (23505) fires on the `date` column — i.e. an override
 * already exists for the requested date.
 * The action layer catches this and surfaces a friendly field error on `date`.
 */
export class HoursOverrideDateConflictError extends Error {
  constructor(date: string) {
    super(`An override already exists for this date (${date}).`);
    this.name = 'HoursOverrideDateConflictError';
  }
}

// ─── PG unique violation error code ──────────────────────────────────────────

const PG_UNIQUE_VIOLATION = '23505';

// ─── List / read queries ──────────────────────────────────────────────────────

export interface ListHoursOverridesOptions {
  from?: string; // inclusive lower bound, YYYY-MM-DD
  to?: string;   // inclusive upper bound, YYYY-MM-DD
}

/**
 * Return all hours override rows ordered by date ascending.
 * Optional `from` / `to` filters (inclusive) restrict to a date range.
 */
export async function listHoursOverrides(
  opts: ListHoursOverridesOptions = {},
): Promise<HoursOverride[]> {
  const { from, to } = opts;

  const conditions = [
    from != null ? gte(hoursOverrides.date, from) : undefined,
    to != null ? lte(hoursOverrides.date, to) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c != null);

  const query = db
    .select()
    .from(hoursOverrides)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(hoursOverrides.date));

  return query;
}

/**
 * Get a single hours override row by id. Returns null if not found.
 */
export async function getHoursOverrideById(
  id: string,
): Promise<HoursOverride | null> {
  const rows = await db
    .select()
    .from(hoursOverrides)
    .where(eq(hoursOverrides.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get a single hours override row by calendar date (YYYY-MM-DD).
 * Returns null if no override exists for that date.
 * Used by the public hours endpoint in Phase 5.
 */
export async function getHoursOverrideByDate(
  date: string,
): Promise<HoursOverride | null> {
  const rows = await db
    .select()
    .from(hoursOverrides)
    .where(eq(hoursOverrides.date, date))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Write queries ─────────────────────────────────────────────────────────────

/**
 * Insert a new hours override. Returns the created row.
 * Throws HoursOverrideDateConflictError if a row already exists for the same date.
 */
export async function createHoursOverride(
  input: NewHoursOverride & { actorId: string },
): Promise<HoursOverride> {
  const { actorId, ...rest } = input;
  try {
    const rows = await db
      .insert(hoursOverrides)
      .values({ ...rest, createdBy: actorId, updatedBy: actorId })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error('createHoursOverride: insert returned no rows');
    }
    return row;
  } catch (err: unknown) {
    const pgCode =
      err != null && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : null;
    if (pgCode === PG_UNIQUE_VIOLATION) {
      throw new HoursOverrideDateConflictError(rest.date ?? '');
    }
    throw err;
  }
}

/**
 * Update an existing hours override by id. Returns the updated row.
 * Throws if no row matched.
 * Throws HoursOverrideDateConflictError if the new date collides with another row.
 */
export async function updateHoursOverride(
  id: string,
  input: Partial<NewHoursOverride> & { actorId: string },
): Promise<HoursOverride> {
  const { actorId, ...rest } = input;
  try {
    const rows = await db
      .update(hoursOverrides)
      .set({ ...rest, updatedBy: actorId, updatedAt: new Date() })
      .where(eq(hoursOverrides.id, id))
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error(`updateHoursOverride: no override found with id ${id}`);
    }
    return row;
  } catch (err: unknown) {
    const pgCode =
      err != null && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : null;
    if (pgCode === PG_UNIQUE_VIOLATION) {
      throw new HoursOverrideDateConflictError(rest.date ?? '');
    }
    throw err;
  }
}

/**
 * Hard-delete an hours override by id.
 */
export async function deleteHoursOverride(id: string): Promise<void> {
  await db.delete(hoursOverrides).where(eq(hoursOverrides.id, id));
}
