'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import {
  createHoursOverrideSchema,
  updateHoursOverrideSchema,
  weeklyScheduleSchema,
} from '@/lib/validators/hours';
import {
  getHoursOverrideById,
  createHoursOverride,
  updateHoursOverride,
  deleteHoursOverride,
  HoursOverrideDateConflictError,
} from '@/lib/db/queries/hours-overrides';
import {
  listWeeklyHours,
  replaceWeeklyHours,
} from '@/lib/db/queries/weekly-hours';
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

/**
 * Atomically update all 7 weekly-schedule rows.
 * Returns { ok: true } on success — ResourceForm shows a sonner toast.
 */
export async function updateWeeklyScheduleAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  // Parse the 7 indexed rows out of FormData
  const days = [];
  for (let i = 0; i < 7; i++) {
    const closedRaw = formData.get(`days.${i}.closed`);
    const openTimeRaw = formData.get(`days.${i}.openTime`);
    const closeTimeRaw = formData.get(`days.${i}.closeTime`);
    days.push({
      dayOfWeek: formData.get(`days.${i}.dayOfWeek`),
      closed: closedRaw === 'true',
      openTime:
        typeof openTimeRaw === 'string' && openTimeRaw !== ''
          ? openTimeRaw
          : null,
      closeTime:
        typeof closeTimeRaw === 'string' && closeTimeRaw !== ''
          ? closeTimeRaw
          : null,
    });
  }

  const result = weeklyScheduleSchema.safeParse({ days });
  if (!result.success) {
    // Flatten nested array paths (e.g. "days > 0 > openTime") into dot-notation
    // keys that react-hook-form's setError(path) can consume directly.
    const flat = result.error.flatten();
    const fieldErrors: Record<string, string[]> = {};

    // fieldErrors from flatten() for array items come back under numeric keys like
    // "days.0.openTime" when the schema uses nested objects — but flatten() actually
    // uses the path array joined with dots. Collect both fieldErrors and formErrors.
    for (const [key, messages] of Object.entries(flat.fieldErrors)) {
      if (messages && messages.length > 0) {
        fieldErrors[key] = messages as string[];
      }
    }

    // Also surface Zod's issue list directly for nested paths that flatten() groups
    // under the parent key rather than the leaf.
    for (const issue of result.error.issues) {
      const dotPath = issue.path.join('.');
      if (dotPath && !fieldErrors[dotPath]) {
        fieldErrors[dotPath] = [issue.message];
      }
    }

    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors,
    };
  }

  // Fetch before-state for the audit diff
  const before = await listWeeklyHours();

  let after;
  try {
    after = await replaceWeeklyHours(result.data.days, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save schedule: ${msg}` };
  }

  await auditUpdate(
    'weekly_hours',
    'all',
    { rows: before } as unknown as Record<string, unknown>,
    { rows: after } as unknown as Record<string, unknown>,
  );

  revalidateHoursPublic();
  revalidatePath('/admin/hours');

  return { ok: true };
}
