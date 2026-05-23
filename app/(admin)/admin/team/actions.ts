'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import {
  teamMemberCreateSchema,
  teamMemberUpdateSchema,
  teamReorderSchema,
} from '@/lib/validators/team';
import {
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  reorderTeamMembers,
  getTeamMemberIds,
} from '@/lib/db/queries/team-members';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';
import { deleteObject } from '@/lib/supabase/storage';
import type { ActionState } from '@/lib/types/action-state';

// ─── Revalidation helper ──────────────────────────────────────────────────────

function revalidateTeam() {
  revalidateTag('team', 'max');
  revalidatePath('/admin/team');
  revalidatePath('/about');
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new team member. image_path is optional at creation time.
 */
export async function createTeamMemberAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    name: formData.get('name'),
    role: formData.get('role'),
    bio: formData.get('bio') ?? '',
    imagePath: formData.get('imagePath') || undefined,
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  };

  const result = teamMemberCreateSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let member;
  try {
    member = await createTeamMember(
      {
        name: data.name,
        role: data.role,
        bio: data.bio,
        imagePath: data.imagePath ?? null,
        sortOrder: data.sortOrder,
      },
      profile.id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to create team member: ${msg}` };
  }

  await auditCreate(
    'team_member',
    member.id,
    member as unknown as Record<string, unknown>,
  );

  revalidateTeam();

  redirect('/admin/team');
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing team member.
 * If image_path is replaced, best-effort deletes the old object from storage.
 */
export async function updateTeamMemberAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getTeamMemberById(id);
  if (!before) {
    return { ok: false, error: 'Team member not found.' };
  }

  const raw = {
    name: formData.get('name') || undefined,
    role: formData.get('role') || undefined,
    bio: formData.get('bio') !== null ? String(formData.get('bio') ?? '') : undefined,
    // Pass null explicitly to clear the image; pass undefined to leave unchanged
    imagePath: formData.has('imagePath')
      ? (formData.get('imagePath') || null)
      : undefined,
    sortOrder: formData.has('sortOrder')
      ? Number(formData.get('sortOrder'))
      : undefined,
  };

  const result = teamMemberUpdateSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let member;
  try {
    member = await updateTeamMember(id, data, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update team member: ${msg}` };
  }

  // Best-effort: remove the old storage object when image_path was replaced
  const oldPath = before.imagePath;
  const newPath = data.imagePath;
  if (
    oldPath &&
    newPath !== undefined &&
    newPath !== oldPath
  ) {
    try {
      await deleteObject({ bucket: 'media', path: oldPath });
    } catch (err) {
      console.error(
        '[team] Failed to delete old storage object after image_path update:',
        { id, oldPath, error: err },
      );
    }
  }

  await auditUpdate(
    'team_member',
    id,
    before as unknown as Record<string, unknown>,
    member as unknown as Record<string, unknown>,
  );

  revalidateTeam();

  return { ok: true, id: member.id };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a team member record and best-effort remove their photo from storage.
 */
export async function deleteTeamMemberAction(
  id: string,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getTeamMemberById(id);
  if (!before) {
    return { ok: false, error: 'Team member not found.' };
  }

  let deleted;
  try {
    deleted = await deleteTeamMember(id, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete team member: ${msg}` };
  }

  // Best-effort: remove photo from storage
  if (deleted?.imagePath) {
    try {
      await deleteObject({ bucket: 'media', path: deleted.imagePath });
    } catch (err) {
      console.error(
        '[team] Failed to delete storage object after team member deletion:',
        { id, path: deleted.imagePath, error: err },
      );
    }
  }

  await auditDelete(
    'team_member',
    id,
    before as unknown as Record<string, unknown>,
  );

  revalidateTeam();

  return { ok: true };
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Reorder team members by persisting a new sort_order for each id in the
 * provided array. Writes ONE audit-log row capturing the before/after id order.
 */
export async function reorderTeamMembersAction(
  orderedIds: string[],
): Promise<ActionState> {
  const profile = await requireStaff();

  const result = teamReorderSchema.safeParse({ orderedIds });
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid reorder payload.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Capture current order for the audit log
  const prevOrderedIds = await getTeamMemberIds();

  try {
    await reorderTeamMembers(result.data.orderedIds, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to reorder team members: ${msg}` };
  }

  await auditCreate(
    'team_member',
    'reorder',
    {},
    {
      action: 'team.reorder',
      before: prevOrderedIds,
      after: result.data.orderedIds,
    },
  );

  revalidateTeam();

  return { ok: true };
}
