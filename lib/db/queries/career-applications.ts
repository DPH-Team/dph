import 'server-only';

import { eq, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { careerApplications } from '@/lib/db/schema';
import type { CareerApplication } from '@/lib/db/schema';
import type { ListApplicationsFilterInput } from '@/lib/validators/careers';
import { deleteObject, createSignedDownloadUrl } from '@/lib/supabase/storage';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Return career applications filtered by status, postingId, and/or a search
 * substring across name and email.
 *
 * Ordering: 'new' applications float to the top (CASE expression), then
 * created_at DESC within each status bucket — mirrors inquiries list behaviour.
 */
export async function listApplications(
  opts: ListApplicationsFilterInput = {},
): Promise<CareerApplication[]> {
  const { status, postingId, q } = opts;

  const conditions = [];

  if (status && status !== 'all') {
    conditions.push(
      eq(
        careerApplications.status,
        status as 'new' | 'reviewed' | 'archived',
      ),
    );
  }

  if (postingId) {
    conditions.push(eq(careerApplications.postingId, postingId));
  }

  if (q && q.trim() !== '') {
    const pattern = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(careerApplications.name, pattern),
        ilike(careerApplications.email, pattern),
      ),
    );
  }

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...(conditions as [NonNullable<(typeof conditions)[0]>, ...NonNullable<(typeof conditions)[0]>[]]));

  // CASE expression: 'new' = 0, others = 1 so new applications float to top.
  const statusPriority = sql<number>`CASE ${careerApplications.status} WHEN 'new' THEN 0 ELSE 1 END`;

  return db
    .select()
    .from(careerApplications)
    .where(where)
    .orderBy(asc(statusPriority), desc(careerApplications.createdAt));
}

// ─── Get by id ────────────────────────────────────────────────────────────────

/**
 * Fetch a single career application by its UUID. Returns null if not found.
 */
export async function getApplicationById(
  id: string,
): Promise<CareerApplication | null> {
  const rows = await db
    .select()
    .from(careerApplications)
    .where(eq(careerApplications.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Update status ────────────────────────────────────────────────────────────

export interface UpdateApplicationStatusOptions {
  status: 'new' | 'reviewed' | 'archived';
  internalNotes?: string | null;
  actorId: string;
}

/**
 * Transition an application's status and optionally update internal_notes.
 *
 * - Moving OFF 'new' (→ reviewed or archived): sets handled_at = now().
 * - Moving BACK TO 'new': clears handled_at to NULL.
 * - Moving within non-new (e.g. reviewed → archived): keeps handled_at
 *   as-is (was already stamped when it first left 'new').
 *
 * Returns the updated row. Throws if no row matched.
 */
export async function updateApplicationStatus(
  id: string,
  opts: UpdateApplicationStatusOptions,
): Promise<CareerApplication> {
  const { status, internalNotes, actorId } = opts;

  const rows = await db
    .update(careerApplications)
    .set({
      status,
      ...(internalNotes !== undefined ? { internalNotes } : {}),
      handledAt: status === 'new' ? null : new Date(),
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(careerApplications.id, id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error(
      `updateApplicationStatus: no application found with id ${id}`,
    );
  }
  return row;
}

// ─── Update notes ─────────────────────────────────────────────────────────────

export interface UpdateApplicationNotesOptions {
  internalNotes: string | null;
  actorId: string;
}

/**
 * Update only the internal_notes field. Does not touch status or handled_at.
 * Returns the updated row. Throws if no row matched.
 */
export async function updateApplicationNotes(
  id: string,
  opts: UpdateApplicationNotesOptions,
): Promise<CareerApplication> {
  const { internalNotes, actorId } = opts;

  const rows = await db
    .update(careerApplications)
    .set({
      internalNotes,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(careerApplications.id, id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error(`updateApplicationNotes: no application found with id ${id}`);
  }
  return row;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete an application by id.
 *
 * If the application has a resume_path, also deletes the underlying object from
 * the private `applications` storage bucket so no orphaned files are left behind.
 *
 * Returns void. Does not throw if the row did not exist.
 */
export async function deleteApplication(id: string): Promise<void> {
  // Retrieve resume_path before deletion so we can clean up storage.
  const rows = await db
    .delete(careerApplications)
    .where(eq(careerApplications.id, id))
    .returning({ resumePath: careerApplications.resumePath });

  const row = rows[0];
  if (row?.resumePath) {
    // Fire-and-forget storage cleanup — log errors but do not re-throw;
    // the DB row is already gone and the storage object is orphaned rather
    // than blocking the action response.
    await deleteObject({ bucket: 'applications', path: row.resumePath }).catch(
      (err: unknown) => {
        console.error(
          `deleteApplication: failed to remove storage object at ${row.resumePath}:`,
          err,
        );
      },
    );
  }
}

// ─── Counts ───────────────────────────────────────────────────────────────────

export interface ApplicationCounts {
  new: number;
  reviewed: number;
  archived: number;
  total: number;
}

/**
 * Return counts of applications grouped by status plus a total.
 * Single query using COUNT FILTER for efficiency.
 * Used by the admin list header pill row.
 */
export async function getApplicationCounts(): Promise<ApplicationCounts> {
  const result = await db
    .select({
      new: sql<number>`count(*) filter (where ${careerApplications.status} = 'new')`.mapWith(
        Number,
      ),
      reviewed:
        sql<number>`count(*) filter (where ${careerApplications.status} = 'reviewed')`.mapWith(
          Number,
        ),
      archived:
        sql<number>`count(*) filter (where ${careerApplications.status} = 'archived')`.mapWith(
          Number,
        ),
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(careerApplications);

  const row = result[0];
  if (!row) {
    return { new: 0, reviewed: 0, archived: 0, total: 0 };
  }
  return row;
}

// ─── Signed download URL ──────────────────────────────────────────────────────

/**
 * Re-export the storage helper for convenience so the admin action layer can
 * call a single import. The storage module is the authoritative home for this
 * helper — we just re-export it here for discoverability in this domain module.
 */
export { createSignedDownloadUrl };
