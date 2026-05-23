import 'server-only';

import { eq, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { careerPostings } from '@/lib/db/schema';
import type { CareerPosting, NewCareerPosting } from '@/lib/db/schema';
import type { ListPostingsFilterInput } from '@/lib/validators/careers';

// ─── List ─────────────────────────────────────────────────────────────────────

export interface ListPostingsOptions extends ListPostingsFilterInput {
  /**
   * When true, restrict results to is_open = true rows.
   * Used by the public /careers page so the query is efficient (the RLS policy
   * also filters, but the explicit WHERE clause lets Postgres use the index).
   */
  onlyOpen?: boolean;
}

/**
 * Return career postings filtered by open/closed status and/or a search substring.
 *
 * Ordering: sort_order ASC, title ASC — same ordering the admin drag-to-sort
 * surface produces.
 */
export async function listPostings(
  opts: ListPostingsOptions = {},
): Promise<CareerPosting[]> {
  const { status, q, onlyOpen } = opts;

  const conditions = [];

  // Explicit onlyOpen flag (public page path — efficient index use)
  if (onlyOpen) {
    conditions.push(eq(careerPostings.isOpen, true));
  } else if (status && status !== 'all') {
    // Admin filter: 'open' = is_open = true, 'closed' = is_open = false
    conditions.push(eq(careerPostings.isOpen, status === 'open'));
  }

  if (q && q.trim() !== '') {
    const pattern = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(careerPostings.title, pattern),
        ilike(careerPostings.department, pattern),
        ilike(careerPostings.description, pattern),
      ),
    );
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...(conditions as [NonNullable<(typeof conditions)[0]>, ...NonNullable<(typeof conditions)[0]>[]]));

  return db
    .select()
    .from(careerPostings)
    .where(where)
    .orderBy(asc(careerPostings.sortOrder), asc(careerPostings.title));
}

// ─── Get by id ────────────────────────────────────────────────────────────────

/**
 * Fetch a single career posting by its UUID. Returns null if not found.
 */
export async function getPostingById(
  id: string,
): Promise<CareerPosting | null> {
  const rows = await db
    .select()
    .from(careerPostings)
    .where(eq(careerPostings.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Insert a new career posting. Sets created_by and updated_by from actorId.
 * Returns the created row.
 */
export async function createPosting(
  input: Omit<
    NewCareerPosting,
    'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
  >,
  actorId: string,
): Promise<CareerPosting> {
  const rows = await db
    .insert(careerPostings)
    .values({ ...input, createdBy: actorId, updatedBy: actorId })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error('createPosting: insert returned no rows');
  }
  return row;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a career posting by id. Stamps updated_by and updated_at.
 * Returns the updated row. Throws if no row matched.
 */
export async function updatePosting(
  id: string,
  input: Partial<
    Omit<
      NewCareerPosting,
      'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  >,
  actorId: string,
): Promise<CareerPosting> {
  const rows = await db
    .update(careerPostings)
    .set({ ...input, updatedBy: actorId, updatedAt: new Date() })
    .where(eq(careerPostings.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`updatePosting: no career posting found with id ${id}`);
  }
  return row;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a career posting by id.
 *
 * The FK from career_applications.posting_id → career_postings(id) is defined
 * ON DELETE SET NULL, so existing applications are retained with posting_id = null.
 *
 * Returns the deleted row's id for audit-log reference.
 * Returns null if no row matched (idempotent).
 */
export async function deletePosting(
  id: string,
): Promise<{ id: string } | null> {
  const rows = await db
    .delete(careerPostings)
    .where(eq(careerPostings.id, id))
    .returning({ id: careerPostings.id });
  return rows[0] ?? null;
}

// ─── Desc ─────────────────────────────────────────────────────────────────────

/**
 * Return counts of postings by open status.
 * Single query using COUNT FILTER for efficiency.
 * Used by the admin list header pill row.
 */
export interface PostingCounts {
  open: number;
  closed: number;
  total: number;
}

export async function getPostingCounts(): Promise<PostingCounts> {
  const result = await db
    .select({
      open: sql<number>`count(*) filter (where ${careerPostings.isOpen} = true)`.mapWith(Number),
      closed: sql<number>`count(*) filter (where ${careerPostings.isOpen} = false)`.mapWith(Number),
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(careerPostings);

  const row = result[0];
  if (!row) {
    return { open: 0, closed: 0, total: 0 };
  }
  return row;
}
