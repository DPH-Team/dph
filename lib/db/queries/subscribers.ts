import 'server-only';

import { eq, ilike, isNull, isNotNull, and, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import type { Subscriber } from '@/lib/db/schema';
import type { ListSubscribersFilterInput } from '@/lib/validators/newsletter';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Return subscribers filtered by status and/or an email search substring.
 * Ordering: subscribedAt DESC (newest first).
 */
export async function listSubscribers(
  opts: ListSubscribersFilterInput = {},
): Promise<Subscriber[]> {
  const { status, search } = opts;

  const conditions = [];

  if (status === 'active') {
    conditions.push(isNull(subscribers.unsubscribedAt));
  } else if (status === 'unsubscribed') {
    conditions.push(isNotNull(subscribers.unsubscribedAt));
  }
  // status === 'all' or undefined → no status condition

  if (search && search.trim() !== '') {
    conditions.push(ilike(subscribers.email, `%${search.trim()}%`));
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(
            ...(conditions as [
              NonNullable<(typeof conditions)[0]>,
              ...NonNullable<(typeof conditions)[0]>[],
            ]),
          );

  return db
    .select()
    .from(subscribers)
    .where(where)
    .orderBy(desc(subscribers.subscribedAt));
}

// ─── Get by id ────────────────────────────────────────────────────────────────

/**
 * Fetch a single subscriber by UUID. Returns null if not found.
 */
export async function getSubscriberById(id: string): Promise<Subscriber | null> {
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Counts ───────────────────────────────────────────────────────────────────

export interface SubscriberCounts {
  active: number;
  unsubscribed: number;
  total: number;
}

/**
 * Return subscriber counts broken down by active / unsubscribed plus total.
 * Single query using COUNT FILTER for efficiency.
 * Used by the admin list header pill row.
 */
export async function getSubscriberCounts(): Promise<SubscriberCounts> {
  const result = await db
    .select({
      active:
        sql<number>`count(*) filter (where ${subscribers.unsubscribedAt} is null)`.mapWith(
          Number,
        ),
      unsubscribed:
        sql<number>`count(*) filter (where ${subscribers.unsubscribedAt} is not null)`.mapWith(
          Number,
        ),
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(subscribers);

  const row = result[0];
  if (!row) {
    return { active: 0, unsubscribed: 0, total: 0 };
  }
  return row;
}

// ─── Soft unsubscribe ─────────────────────────────────────────────────────────

export interface ActorOptions {
  actorId: string;
}

/**
 * Soft-unsubscribe a subscriber by setting unsubscribed_at = now().
 * No-ops (idempotent) if the subscriber is already unsubscribed — the WHERE
 * clause only matches rows where unsubscribed_at IS NULL.
 * Returns the updated row. Throws if no row matched (subscriber not found).
 */
export async function markSubscriberUnsubscribed(
  id: string,
  opts: ActorOptions,
): Promise<Subscriber> {
  const rows = await db
    .update(subscribers)
    .set({
      unsubscribedAt: new Date(),
      updatedBy: opts.actorId,
      updatedAt: new Date(),
    })
    .where(and(eq(subscribers.id, id), isNull(subscribers.unsubscribedAt)))
    .returning();

  const row = rows[0];
  if (!row) {
    // Either the row does not exist or it was already unsubscribed.
    // Fetch to distinguish:
    const existing = await getSubscriberById(id);
    if (!existing) {
      throw new Error(`markSubscriberUnsubscribed: no subscriber found with id ${id}`);
    }
    // Already unsubscribed — return the current row unchanged.
    return existing;
  }
  return row;
}

// ─── Resubscribe ──────────────────────────────────────────────────────────────

/**
 * Resubscribe a subscriber by clearing unsubscribed_at.
 * Returns the updated row. Throws if no row matched.
 */
export async function resubscribeSubscriber(
  id: string,
  opts: ActorOptions,
): Promise<Subscriber> {
  const rows = await db
    .update(subscribers)
    .set({
      unsubscribedAt: null,
      updatedBy: opts.actorId,
      updatedAt: new Date(),
    })
    .where(eq(subscribers.id, id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error(`resubscribeSubscriber: no subscriber found with id ${id}`);
  }
  return row;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a subscriber by id. Used for spam cleanup.
 */
export async function deleteSubscriber(id: string): Promise<void> {
  await db.delete(subscribers).where(eq(subscribers.id, id));
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export interface SubscriberCsvRow {
  email: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
  source: string;
}

/**
 * Return subscriber rows shaped for CSV export.
 * Applies the same status filter as the list view.
 * Ordered by subscribedAt DESC.
 *
 * NOTE: This returns the raw data rows — CSV serialisation (streaming or
 * buffered) is the responsibility of the calling server action or route handler.
 */
export async function exportSubscribersForCsv(opts: {
  status?: ListSubscribersFilterInput['status'];
}): Promise<SubscriberCsvRow[]> {
  const { status } = opts;

  let statusCondition = undefined;
  if (status === 'active') {
    statusCondition = isNull(subscribers.unsubscribedAt);
  } else if (status === 'unsubscribed') {
    statusCondition = isNotNull(subscribers.unsubscribedAt);
  }
  // 'all' or undefined → no condition

  const rows = await db
    .select({
      email: subscribers.email,
      subscribedAt: subscribers.subscribedAt,
      unsubscribedAt: subscribers.unsubscribedAt,
      source: subscribers.source,
    })
    .from(subscribers)
    .where(statusCondition)
    .orderBy(desc(subscribers.subscribedAt));

  return rows;
}
