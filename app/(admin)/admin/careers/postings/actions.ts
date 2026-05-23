'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { postingSchema } from '@/lib/validators/careers';
import {
  createPosting,
  getPostingById,
  updatePosting,
  deletePosting,
} from '@/lib/db/queries/career-postings';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

// ─── Revalidation helper ──────────────────────────────────────────────────────

function revalidateCareers(id?: string) {
  revalidatePath('/admin/careers');
  revalidatePath('/admin/careers/postings');
  if (id) revalidatePath(`/admin/careers/postings/${id}`);
}

// ─── Parse bullet list field ──────────────────────────────────────────────────

/**
 * Parses a FormData field that is either:
 * - A JSON-encoded array (from the hidden input approach), or
 * - A newline-delimited string where each line is one bullet.
 *
 * Returns an array of non-empty trimmed strings.
 */
function parseBulletList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  // Try JSON first (hidden-input approach)
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return (parsed as unknown[])
          .filter((v): v is string => typeof v === 'string')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      // fall through to newline split
    }
  }
  // Newline-separated fallback
  return trimmed
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new career posting.
 * Redirects to the postings list on success.
 */
export async function createPostingAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    title: formData.get('title'),
    type: formData.get('type'),
    department: formData.get('department'),
    description: formData.get('description'),
    responsibilities: parseBulletList(formData.get('responsibilities')),
    requirements: parseBulletList(formData.get('requirements')),
    isOpen: formData.get('isOpen') === 'true',
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  };

  const result = postingSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  let posting;
  try {
    posting = await createPosting(result.data, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to create posting: ${msg}` };
  }

  await auditCreate(
    'career_posting',
    posting.id,
    posting as unknown as Record<string, unknown>,
  );

  revalidateCareers(posting.id);

  redirect('/admin/careers');
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing career posting.
 */
export async function updatePostingAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getPostingById(id);
  if (!before) {
    return { ok: false, error: 'Posting not found.' };
  }

  const raw = {
    title: formData.get('title'),
    type: formData.get('type'),
    department: formData.get('department'),
    description: formData.get('description'),
    responsibilities: parseBulletList(formData.get('responsibilities')),
    requirements: parseBulletList(formData.get('requirements')),
    isOpen: formData.get('isOpen') === 'true',
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  };

  const result = postingSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  let after;
  try {
    after = await updatePosting(id, result.data, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update posting: ${msg}` };
  }

  await auditUpdate(
    'career_posting',
    id,
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );

  revalidateCareers(id);

  return { ok: true, id: after.id };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a career posting. Redirects to /admin/careers on success.
 * Applications whose posting_id references this posting will have posting_id
 * set to null by the ON DELETE SET NULL cascade.
 */
export async function deletePostingAction(id: string): Promise<ActionState> {
  await requireStaff();

  const before = await getPostingById(id);
  if (!before) {
    return { ok: false, error: 'Posting not found.' };
  }

  try {
    await deletePosting(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete posting: ${msg}` };
  }

  await auditDelete(
    'career_posting',
    id,
    before as unknown as Record<string, unknown>,
  );

  revalidateCareers();

  redirect('/admin/careers');
}
