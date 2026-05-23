'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import {
  updateApplicationStatusSchema,
  updateApplicationNotesSchema,
} from '@/lib/validators/careers';
import {
  getApplicationById,
  updateApplicationStatus,
  updateApplicationNotes,
  deleteApplication,
  createSignedDownloadUrl,
} from '@/lib/db/queries/career-applications';
import { auditUpdate, auditDelete, audit } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

// ─── Revalidation helper ──────────────────────────────────────────────────────

function revalidateApplications(id?: string) {
  revalidatePath('/admin/careers/applications');
  if (id) revalidatePath(`/admin/careers/applications/${id}`);
}

// ─── Update status ────────────────────────────────────────────────────────────

/**
 * Transition an application's status and optionally update internal_notes.
 */
export async function updateApplicationStatusAction(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    status: formData.get('status'),
    internalNotes: formData.get('internalNotes') ?? undefined,
  };

  const result = updateApplicationStatusSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid status value.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await getApplicationById(id);
  if (!before) {
    return { ok: false, error: 'Application not found.' };
  }

  let after;
  try {
    after = await updateApplicationStatus(id, {
      status: result.data.status,
      internalNotes: result.data.internalNotes,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update status: ${msg}` };
  }

  await auditUpdate(
    'career_application',
    id,
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );

  revalidateApplications(id);

  return { ok: true };
}

// ─── Update notes ─────────────────────────────────────────────────────────────

/**
 * Update only the internal notes for an application.
 */
export async function updateApplicationNotesAction(
  id: string,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    internalNotes: formData.get('internalNotes') ?? undefined,
  };

  const result = updateApplicationNotesSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid notes value.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await getApplicationById(id);
  if (!before) {
    return { ok: false, error: 'Application not found.' };
  }

  let after;
  try {
    after = await updateApplicationNotes(id, {
      internalNotes: result.data.internalNotes ?? null,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save notes: ${msg}` };
  }

  await auditUpdate(
    'career_application',
    id,
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );

  revalidateApplications(id);

  return { ok: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete an application. Also removes resume file from storage (handled
 * inside the deleteApplication query). Redirects to applications list.
 */
export async function deleteApplicationAction(id: string): Promise<ActionState> {
  await requireStaff();

  const before = await getApplicationById(id);
  if (!before) {
    return { ok: false, error: 'Application not found.' };
  }

  try {
    await deleteApplication(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete application: ${msg}` };
  }

  await auditDelete(
    'career_application',
    id,
    before as unknown as Record<string, unknown>,
  );

  revalidatePath('/admin/careers/applications');

  redirect('/admin/careers/applications');
}

// ─── Resume download URL ──────────────────────────────────────────────────────

/**
 * Generate a short-lived signed URL for downloading an applicant's resume.
 * Audits a view_resume action — resume access is a sensitive operation.
 * Returns { url } on success, { error } on failure.
 */
export async function getResumeDownloadUrlAction(
  id: string,
): Promise<{ url: string } | { error: string }> {
  await requireStaff();

  const application = await getApplicationById(id);
  if (!application) {
    return { error: 'Application not found.' };
  }

  if (!application.resumePath) {
    return { error: 'No resume attached to this application.' };
  }

  let url: string;
  try {
    url = await createSignedDownloadUrl({
      bucket: 'applications',
      path: application.resumePath,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to generate download URL: ${msg}` };
  }

  // Audit the resume view — resume access is sensitive
  await audit('view_resume', 'career_application', id, {
    resumePath: application.resumePath,
  });

  return { url };
}
