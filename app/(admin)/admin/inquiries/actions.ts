'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import {
  updateInquiryStatusSchema,
  updateInquiryNotesSchema,
} from '@/lib/validators/inquiries';
import {
  getInquiryById,
  updateInquiryStatus,
  updateInquiryNotes,
  deleteInquiry,
} from '@/lib/db/queries/inquiries';
import { auditUpdate, auditDelete } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

// ─── Update status ────────────────────────────────────────────────────────────

/**
 * Transition an inquiry's status.
 * Optionally carries updated internal_notes in the same round-trip.
 */
export async function updateInquiryStatusAction(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    status: formData.get('status'),
    internalNotes: formData.get('internalNotes') ?? undefined,
  };

  const result = updateInquiryStatusSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid status value.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await getInquiryById(id);
  if (!before) {
    return { ok: false, error: 'Inquiry not found.' };
  }

  let after;
  try {
    after = await updateInquiryStatus(id, {
      status: result.data.status,
      internalNotes: result.data.internalNotes,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update status: ${msg}` };
  }

  await auditUpdate(
    'inquiry',
    id,
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );

  revalidatePath('/admin/inquiries');
  revalidatePath(`/admin/inquiries/${id}`);

  return { ok: true };
}

// ─── Update notes ─────────────────────────────────────────────────────────────

/**
 * Update only the internal notes for an inquiry.
 */
export async function updateInquiryNotesAction(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    internalNotes: formData.get('internalNotes') ?? undefined,
  };

  const result = updateInquiryNotesSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid notes value.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await getInquiryById(id);
  if (!before) {
    return { ok: false, error: 'Inquiry not found.' };
  }

  let after;
  try {
    after = await updateInquiryNotes(id, {
      internalNotes: result.data.internalNotes ?? null,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save notes: ${msg}` };
  }

  await auditUpdate(
    'inquiry',
    id,
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );

  revalidatePath('/admin/inquiries');
  revalidatePath(`/admin/inquiries/${id}`);

  return { ok: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete an inquiry. On success redirects to the list.
 * Returns ActionState only on the error path.
 */
export async function deleteInquiryAction(id: string): Promise<ActionState> {
  await requireStaff();

  const before = await getInquiryById(id);
  if (!before) {
    return { ok: false, error: 'Inquiry not found.' };
  }

  try {
    await deleteInquiry(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete inquiry: ${msg}` };
  }

  await auditDelete(
    'inquiry',
    id,
    before as unknown as Record<string, unknown>,
  );

  revalidatePath('/admin/inquiries');

  redirect('/admin/inquiries');
}
