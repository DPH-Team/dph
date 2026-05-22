import 'server-only';

import { eq, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { inquiries } from '@/lib/db/schema';
import type { Inquiry } from '@/lib/db/schema';
import type { ListInquiriesFilterInput } from '@/lib/validators/inquiries';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Return inquiries filtered by status, type, and/or a search substring.
 *
 * Ordering: pending rows always sort to the top (via CASE expression), then
 * created_at DESC within each status bucket.
 */
export async function listInquiries(
  opts: ListInquiriesFilterInput = {},
): Promise<Inquiry[]> {
  const { type, status, search } = opts;

  // Build WHERE conditions incrementally
  const conditions = [];

  if (status && status !== 'all') {
    conditions.push(
      eq(inquiries.status, status as 'pending' | 'confirmed' | 'declined'),
    );
  }

  if (type && type !== 'all') {
    conditions.push(
      eq(
        inquiries.type,
        type as 'reservation' | 'private_event' | 'press' | 'general',
      ),
    );
  }

  if (search && search.trim() !== '') {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(inquiries.name, pattern),
        ilike(inquiries.email, pattern),
        ilike(inquiries.message, pattern),
      ),
    );
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...(conditions as [NonNullable<(typeof conditions)[0]>, ...NonNullable<(typeof conditions)[0]>[]]));

  // CASE expression: pending = 0, others = 1 so pending rows float to the top.
  const statusPriority = sql<number>`CASE ${inquiries.status} WHEN 'pending' THEN 0 ELSE 1 END`;

  return db
    .select()
    .from(inquiries)
    .where(where)
    .orderBy(asc(statusPriority), desc(inquiries.createdAt));
}

// ─── Get by id ────────────────────────────────────────────────────────────────

/**
 * Fetch a single inquiry by its UUID. Returns null if not found.
 */
export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const rows = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Update status ────────────────────────────────────────────────────────────

export interface UpdateInquiryStatusOptions {
  status: 'pending' | 'confirmed' | 'declined';
  internalNotes?: string | null;
  actorId: string;
}

/**
 * Transition an inquiry's status and optionally update internal_notes.
 *
 * - Moving OFF 'pending' (→ confirmed or declined): sets handled_at = now().
 * - Moving BACK TO 'pending': clears handled_at to NULL.
 * - Moving within non-pending (e.g. confirmed → declined): keeps handled_at
 *   as-is (was already stamped when it first left pending).
 *
 * Returns the updated row. Throws if no row matched.
 */
export async function updateInquiryStatus(
  id: string,
  opts: UpdateInquiryStatusOptions,
): Promise<Inquiry> {
  const { status, internalNotes, actorId } = opts;

  // Always write handled_at per destination status:
  //   pending  → null  (clear — moving back to unhandled)
  //   anything else → now()  (stamp first time off pending; idempotent for
  //                           confirmed→declined transitions)
  // This avoids a read-then-write race condition.

  const rows = await db
    .update(inquiries)
    .set({
      status,
      ...(internalNotes !== undefined ? { internalNotes } : {}),
      handledAt: status === 'pending' ? null : new Date(),
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(inquiries.id, id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error(`updateInquiryStatus: no inquiry found with id ${id}`);
  }
  return row;
}

// ─── Update notes ─────────────────────────────────────────────────────────────

export interface UpdateInquiryNotesOptions {
  internalNotes: string | null;
  actorId: string;
}

/**
 * Update only the internal_notes field. Does not touch status or handled_at.
 * Returns the updated row. Throws if no row matched.
 */
export async function updateInquiryNotes(
  id: string,
  opts: UpdateInquiryNotesOptions,
): Promise<Inquiry> {
  const { internalNotes, actorId } = opts;

  const rows = await db
    .update(inquiries)
    .set({
      internalNotes,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(inquiries.id, id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error(`updateInquiryNotes: no inquiry found with id ${id}`);
  }
  return row;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete an inquiry by id. Used for spam cleanup.
 */
export async function deleteInquiry(id: string): Promise<void> {
  await db.delete(inquiries).where(eq(inquiries.id, id));
}

// ─── Counts ───────────────────────────────────────────────────────────────────

export interface InquiryCounts {
  pending: number;
  confirmed: number;
  declined: number;
  total: number;
}

/**
 * Return counts of inquiries grouped by status plus a total.
 * Single query using COUNT FILTER for efficiency.
 * Used by the admin list header pill row.
 */
export async function getInquiryCounts(): Promise<InquiryCounts> {
  const result = await db
    .select({
      pending:
        sql<number>`count(*) filter (where ${inquiries.status} = 'pending')`.mapWith(
          Number,
        ),
      confirmed:
        sql<number>`count(*) filter (where ${inquiries.status} = 'confirmed')`.mapWith(
          Number,
        ),
      declined:
        sql<number>`count(*) filter (where ${inquiries.status} = 'declined')`.mapWith(
          Number,
        ),
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(inquiries);

  const row = result[0];
  if (!row) {
    return { pending: 0, confirmed: 0, declined: 0, total: 0 };
  }
  return row;
}
