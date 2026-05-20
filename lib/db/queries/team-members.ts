import 'server-only';

import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { teamMembers } from '@/lib/db/schema';
import type { TeamMember, NewTeamMember } from '@/lib/db/schema';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List all team members ordered by (sort_order ASC, name ASC).
 */
export async function listTeamMembers(): Promise<TeamMember[]> {
  return db
    .select()
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.name));
}

// ─── Get by id ────────────────────────────────────────────────────────────────

/**
 * Get a single team member by id. Returns null if not found.
 */
export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Insert a new team member. Returns the created row.
 */
export async function createTeamMember(
  input: Omit<NewTeamMember, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  actorId: string,
): Promise<TeamMember> {
  const rows = await db
    .insert(teamMembers)
    .values({ ...input, createdBy: actorId, updatedBy: actorId })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error('createTeamMember: insert returned no rows');
  }
  return row;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a team member by id. Returns the updated row.
 * Throws if the row does not exist.
 */
export async function updateTeamMember(
  id: string,
  input: Partial<Omit<NewTeamMember, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>,
  actorId: string,
): Promise<TeamMember> {
  const rows = await db
    .update(teamMembers)
    .set({ ...input, updatedBy: actorId, updatedAt: new Date() })
    .where(eq(teamMembers.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`updateTeamMember: no team member found with id ${id}`);
  }
  return row;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a team member by id.
 * Returns the deleted row's image_path (or null if no photo) so the calling
 * action can clean up storage.
 * Returns null if the row did not exist.
 */
export async function deleteTeamMember(
  id: string,
  actorId: string,
): Promise<{ imagePath: string | null } | null> {
  void actorId; // actor is recorded in the audit log by the action layer
  const rows = await db
    .delete(teamMembers)
    .where(eq(teamMembers.id, id))
    .returning({ imagePath: teamMembers.imagePath });
  return rows[0] ?? null;
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Bulk-reindex team members according to the provided ordered ID array.
 * Each member's sort_order is set to its index (0-based) in the array.
 * Runs in a transaction; writes updated_at and updated_by on every touched row.
 */
export async function reorderTeamMembers(
  orderedIds: string[],
  actorId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(teamMembers)
        .set({
          sortOrder: i,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(teamMembers.id, orderedIds[i]!));
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the current ordered list of team member IDs (sort_order ASC, name ASC).
 * Used by the reorder action to capture the "before" snapshot for the audit log.
 */
export async function getTeamMemberIds(): Promise<string[]> {
  const rows = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.name));
  return rows.map((r) => r.id);
}
