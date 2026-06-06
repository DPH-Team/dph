import 'server-only';

import { eq, ilike, isNull, isNotNull, and, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { subscribers } from '@/lib/db/schema';
import type { Subscriber } from '@/lib/db/schema';
import {
  normaliseFilterStatus,
  type ListSubscribersFilterInput,
} from '@/lib/validators/newsletter';

// ─── Active-state helpers ─────────────────────────────────────────────────────
//
// "Active" (confirmed) = confirmed_at IS NOT NULL AND unsubscribed_at IS NULL.
// "Pending"            = confirmed_at IS NULL      AND unsubscribed_at IS NULL.
// "Unsubscribed"       = unsubscribed_at IS NOT NULL (regardless of confirmed_at).

const isConfirmed = and(
  isNotNull(subscribers.confirmedAt),
  isNull(subscribers.unsubscribedAt),
);
const isPending = and(
  isNull(subscribers.confirmedAt),
  isNull(subscribers.unsubscribedAt),
);
const isUnsubscribed = isNotNull(subscribers.unsubscribedAt);

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Return subscribers filtered by status and/or an email search substring.
 * Ordering: subscribedAt DESC (newest first).
 *
 * status values (canonical — pass through normaliseFilterStatus() first):
 *   'confirmed'    — only confirmed (active) rows (formerly 'active')
 *   'pending'      — only pending (unconfirmed) rows
 *   'unsubscribed' — only unsubscribed rows
 *   'all'          — no status condition (all rows)
 *   'active'       — back-compat alias, normalised to 'confirmed'
 *   undefined      — no status condition (all rows)
 */
export async function listSubscribers(
  opts: ListSubscribersFilterInput = {},
): Promise<Subscriber[]> {
  const { search } = opts;
  const status = normaliseFilterStatus(opts.status);

  const conditions = [];

  if (status === 'confirmed') {
    conditions.push(isConfirmed);
  } else if (status === 'pending') {
    conditions.push(isPending);
  } else if (status === 'unsubscribed') {
    conditions.push(isUnsubscribed);
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

// ─── Get by email ─────────────────────────────────────────────────────────────

/**
 * Fetch a single subscriber by email (exact, case-insensitive via lower()).
 * Returns null if not found.
 * Used by the subscribe action to detect duplicate / re-subscribe flows.
 */
export async function getSubscriberByEmail(
  email: string,
): Promise<Subscriber | null> {
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Counts ───────────────────────────────────────────────────────────────────

export interface SubscriberCounts {
  /** Confirmed (active) subscribers only — pending are excluded. */
  active: number;
  /** Pending (awaiting email confirmation) subscribers. */
  pending: number;
  unsubscribed: number;
  total: number;
}

/**
 * Return subscriber counts broken down by confirmed / pending / unsubscribed
 * plus total. Single query using COUNT FILTER for efficiency.
 * Used by the admin list header pill row.
 *
 * Note: the `active` field is an alias for `confirmed` so the existing admin
 * page pill renders the right number without changes (dph-admin must add the
 * pending pill separately).
 */
export async function getSubscriberCounts(): Promise<SubscriberCounts> {
  const result = await db
    .select({
      active:
        sql<number>`count(*) filter (where ${subscribers.confirmedAt} is not null and ${subscribers.unsubscribedAt} is null)`.mapWith(
          Number,
        ),
      pending:
        sql<number>`count(*) filter (where ${subscribers.confirmedAt} is null and ${subscribers.unsubscribedAt} is null)`.mapWith(
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
    return { active: 0, pending: 0, unsubscribed: 0, total: 0 };
  }
  return row;
}

// ─── Create pending subscriber ─────────────────────────────────────────────────

/**
 * Insert a new subscriber in the pending state (confirmed_at = null).
 * The confirm_token is provided by the caller (must be a fresh UUID).
 * The unsubscribe_token is generated by the DB default.
 * Returns the full row (caller needs unsubscribeToken for the confirmation
 * email and confirmToken for the confirmation link).
 */
export async function createPendingSubscriber(opts: {
  email: string;
  source?: string;
  confirmToken: string;
}): Promise<Subscriber> {
  const rows = await db
    .insert(subscribers)
    .values({
      email: opts.email.toLowerCase(),
      source: opts.source ?? 'public_form',
      confirmToken: opts.confirmToken,
      // confirmedAt left null — pending state
      // unsubscribeToken uses column default (gen_random_uuid())
    })
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error('createPendingSubscriber: insert returned no row');
  }
  return row;
}

// ─── Re-issue confirm token ───────────────────────────────────────────────────

/**
 * Replace the confirm_token for an existing subscriber (e.g. resend flow).
 * Only updates the token — does not touch confirmed_at or unsubscribed_at.
 */
export async function reissueConfirm(
  id: string,
  confirmToken: string,
): Promise<void> {
  await db
    .update(subscribers)
    .set({ confirmToken, updatedAt: new Date() })
    .where(eq(subscribers.id, id));
}

// ─── Reopen as pending ────────────────────────────────────────────────────────

/**
 * Re-enter a previously unsubscribed row into the pending state so a fresh
 * double-opt-in confirmation email can be sent.
 * Clears unsubscribed_at, confirmed_at, and sets a new confirm_token.
 */
export async function reopenAsPending(
  id: string,
  confirmToken: string,
): Promise<void> {
  await db
    .update(subscribers)
    .set({
      unsubscribedAt: null,
      confirmedAt: null,
      confirmToken,
      updatedAt: new Date(),
    })
    .where(eq(subscribers.id, id));
}

// ─── Confirm subscriber ───────────────────────────────────────────────────────

export type ConfirmResult = { status: 'confirmed'; id: string } | { status: 'invalid' };

/**
 * Confirm a subscriber by their confirm_token.
 * Sets confirmed_at = now() and nulls confirm_token atomically.
 * The WHERE clause ensures only a pending (unconfirmed) row matches — already-
 * confirmed rows or invalid tokens return 'invalid'.
 * Returns { status: 'confirmed', id } on success, { status: 'invalid' } otherwise.
 */
export async function confirmSubscriber(token: string): Promise<ConfirmResult> {
  const rows = await db
    .update(subscribers)
    .set({ confirmedAt: new Date(), confirmToken: null, updatedAt: new Date() })
    .where(
      and(
        eq(subscribers.confirmToken, token),
        isNull(subscribers.confirmedAt),
      ),
    )
    .returning({ id: subscribers.id });

  const row = rows[0];
  if (!row) {
    return { status: 'invalid' };
  }
  return { status: 'confirmed', id: row.id };
}

// ─── Unsubscribe by token ─────────────────────────────────────────────────────

export type UnsubscribeByTokenResult =
  | { status: 'ok'; id: string }
  | { status: 'invalid' };

/**
 * Unsubscribe a subscriber by their permanent unsubscribe_token.
 * Sets unsubscribed_at = COALESCE(unsubscribed_at, now()) (idempotent) and
 * nulls the confirm_token.
 * Returns { status: 'ok', id } if a row was matched; { status: 'invalid' } otherwise.
 */
export async function unsubscribeByToken(
  token: string,
): Promise<UnsubscribeByTokenResult> {
  const rows = await db
    .update(subscribers)
    .set({
      unsubscribedAt: sql`coalesce(${subscribers.unsubscribedAt}, now())`,
      confirmToken: null,
      updatedAt: new Date(),
    })
    .where(eq(subscribers.unsubscribeToken, token))
    .returning({ id: subscribers.id });

  const row = rows[0];
  if (!row) {
    return { status: 'invalid' };
  }
  return { status: 'ok', id: row.id };
}

// ─── Soft unsubscribe (admin, by id) ─────────────────────────────────────────

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
      confirmToken: null,
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

// ─── Resubscribe (admin, by id) ───────────────────────────────────────────────

/**
 * Admin resubscribe: clears unsubscribed_at only, leaving confirmed_at intact
 * so a previously-confirmed subscriber is immediately active again without
 * needing to re-confirm.
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
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  source: string;
  /** Derived status label for the CSV column. */
  status: 'confirmed' | 'pending' | 'unsubscribed';
}

/**
 * Return subscriber rows shaped for CSV export.
 * Applies the same status filter as the list view.
 * Ordered by subscribedAt DESC.
 *
 * IMPORTANT: when status = 'confirmed' (the export-route default), ONLY
 * confirmed rows are returned. Pending rows must never be exported or included
 * in broadcast sends — no consent has been collected yet.
 *
 * NOTE: CSV serialisation (streaming or buffered) is the responsibility of the
 * calling server action or route handler.
 */
export async function exportSubscribersForCsv(opts: {
  status?: ListSubscribersFilterInput['status'];
}): Promise<SubscriberCsvRow[]> {
  const status = normaliseFilterStatus(opts.status);

  let statusCondition = undefined;
  if (status === 'confirmed') {
    // Explicit: confirmed rows only (no pending, no unsubscribed).
    statusCondition = isConfirmed;
  } else if (status === 'pending') {
    statusCondition = isPending;
  } else if (status === 'unsubscribed') {
    statusCondition = isUnsubscribed;
  }
  // 'all' or undefined → no condition

  const rows = await db
    .select({
      email: subscribers.email,
      subscribedAt: subscribers.subscribedAt,
      confirmedAt: subscribers.confirmedAt,
      unsubscribedAt: subscribers.unsubscribedAt,
      source: subscribers.source,
    })
    .from(subscribers)
    .where(statusCondition)
    .orderBy(desc(subscribers.subscribedAt));

  return rows.map((row) => ({
    ...row,
    status: row.unsubscribedAt
      ? 'unsubscribed'
      : row.confirmedAt
        ? 'confirmed'
        : 'pending',
  }));
}
