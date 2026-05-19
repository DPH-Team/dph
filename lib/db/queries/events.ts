import 'server-only';

import { eq, desc, asc, and, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import type { Event, NewEvent } from '@/lib/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListEventsOptions {
  published?: boolean;
  upcoming?: boolean;
  limit?: number;
  offset?: number;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List events with optional filters.
 * Defaults to: featured desc, starts_at asc.
 */
export async function listEvents(opts: ListEventsOptions = {}): Promise<Event[]> {
  const { published, upcoming, limit = 100, offset = 0 } = opts;

  const conditions = [];

  if (published === true) {
    conditions.push(eq(events.published, true));
  }

  if (upcoming === true) {
    // coalesce(ends_at, starts_at) >= now()
    conditions.push(
      gte(sql`coalesce(${events.endsAt}, ${events.startsAt})`, sql`now()`),
    );
  }

  const query = db
    .select()
    .from(events)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(events.featured), asc(events.startsAt))
    .limit(limit)
    .offset(offset);

  return query;
}

/**
 * Get a single event by id. Returns null if not found.
 */
export async function getEventById(id: string): Promise<Event | null> {
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Get a single event by slug (case-insensitive). Returns null if not found.
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const rows = await db
    .select()
    .from(events)
    .where(sql`lower(${events.slug}) = lower(${slug})`)
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Insert a new event row. Returns the created event.
 */
export async function createEvent(input: NewEvent): Promise<Event> {
  const rows = await db.insert(events).values(input).returning();
  const row = rows[0];
  if (!row) {
    throw new Error('createEvent: insert returned no rows');
  }
  return row;
}

/**
 * Update an event row by id. Returns the updated event.
 * Throws if the row is not found.
 */
export async function updateEvent(
  id: string,
  input: Partial<NewEvent>,
): Promise<Event> {
  const rows = await db
    .update(events)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`updateEvent: no event found with id ${id}`);
  }
  return row;
}

/**
 * Delete an event row by id.
 * This is a hard delete — events have no child rows in Phase 4.
 */
export async function deleteEvent(id: string): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
}
