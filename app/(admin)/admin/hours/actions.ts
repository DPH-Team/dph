'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import {
  createHoursOverrideSchema,
  updateHoursOverrideSchema,
} from '@/lib/validators/hours';
import {
  getHoursOverrideById,
  createHoursOverride,
  updateHoursOverride,
  deleteHoursOverride,
  HoursOverrideDateConflictError,
} from '@/lib/db/queries/hours-overrides';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

// ─── Revalidation helpers ─────────────────────────────────────────────────────

function revalidateHoursPublic() {
  revalidateTag('hours', 'max');
  revalidatePath('/');
  revalidatePath('/contact');
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Create a new hours override.
 * On success redirects to /admin/hours (the list view).
 */
export async function createHoursOverrideAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const closedRaw = formData.get('closed') === 'true';
  const openTimeRaw = formData.get('openTime');
  const closeTimeRaw = formData.get('closeTime');
  const noteRaw = formData.get('note');

  const raw = {
    date: formData.get('date'),
    closed: closedRaw,
    openTime: typeof openTimeRaw === 'string' && openTimeRaw !== '' ? openTimeRaw : null,
    closeTime: typeof closeTimeRaw === 'string' && closeTimeRaw !== '' ? closeTimeRaw : null,
    note: typeof noteRaw === 'string' && noteRaw !== '' ? noteRaw : null,
  };

  const result = createHoursOverrideSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let row;
  try {
    row = await createHoursOverride({
      date: data.date,
      closed: data.closed ?? false,
      openTime: data.openTime ?? null,
      closeTime: data.closeTime ?? null,
      note: data.note ?? null,
      actorId: profile.id,
    });
  } catch (err) {
    if (err instanceof HoursOverrideDateConflictError) {
      return {
        ok: false,
        error: 'Please correct the errors below.',
        fieldErrors: { date: ['An override already exists for this date.'] },
      };
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to create override: ${msg}` };
  }

  await auditCreate(
    'hours_override',
    row.id,
    row as unknown as Record<string, unknown>,
  );

  revalidateHoursPublic();
  revalidatePath('/admin/hours');

  redirect('/admin/hours');
}

/**
 * Update an existing hours override.
 * Returns { ok: true } on success — ResourceForm shows a sonner toast.
 */
export async function updateHoursOverrideAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getHoursOverrideById(id);
  if (!before) {
    return { ok: false, error: 'Override not found.' };
  }

  const closedRaw = formData.get('closed') === 'true';
  const openTimeRaw = formData.get('openTime');
  const closeTimeRaw = formData.get('closeTime');
  const noteRaw = formData.get('note');

  const raw = {
    date: formData.get('date'),
    closed: closedRaw,
    openTime: typeof openTimeRaw === 'string' && openTimeRaw !== '' ? openTimeRaw : null,
    closeTime: typeof closeTimeRaw === 'string' && closeTimeRaw !== '' ? closeTimeRaw : null,
    note: typeof noteRaw === 'string' && noteRaw !== '' ? noteRaw : null,
  };

  const result = updateHoursOverrideSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let row;
  try {
    row = await updateHoursOverride(id, {
      date: data.date,
      closed: data.closed ?? false,
      openTime: data.openTime ?? null,
      closeTime: data.closeTime ?? null,
      note: data.note ?? null,
      actorId: profile.id,
    });
  } catch (err) {
    if (err instanceof HoursOverrideDateConflictError) {
      return {
        ok: false,
        error: 'Please correct the errors below.',
        fieldErrors: { date: ['An override already exists for this date.'] },
      };
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update override: ${msg}` };
  }

  await auditUpdate(
    'hours_override',
    id,
    before as unknown as Record<string, unknown>,
    row as unknown as Record<string, unknown>,
  );

  revalidateHoursPublic();
  revalidatePath('/admin/hours');
  revalidatePath(`/admin/hours/${id}`);

  return { ok: true, id: row.id };
}

/**
 * Delete an hours override by id.
 * On success redirects to /admin/hours.
 */
export async function deleteHoursOverrideAction(
  id: string,
): Promise<ActionState> {
  await requireStaff();

  const before = await getHoursOverrideById(id);
  if (!before) {
    return { ok: false, error: 'Override not found.' };
  }

  try {
    await deleteHoursOverride(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete override: ${msg}` };
  }

  await auditDelete(
    'hours_override',
    id,
    before as unknown as Record<string, unknown>,
  );

  revalidateHoursPublic();
  revalidatePath('/admin/hours');

  redirect('/admin/hours');
}
