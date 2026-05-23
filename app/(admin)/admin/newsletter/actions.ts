'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  getSubscriberById,
  markSubscriberUnsubscribed,
  resubscribeSubscriber,
  deleteSubscriber,
} from '@/lib/db/queries/subscribers';
import { auditUpdate, auditDelete } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

/**
 * Soft-unsubscribe a subscriber (sets unsubscribed_at = now()).
 * Admin-only.
 */
export async function unsubscribeSubscriberAction(
  id: string,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const before = await getSubscriberById(id);
  if (!before) {
    return { ok: false, error: 'Subscriber not found.' };
  }

  let after;
  try {
    after = await markSubscriberUnsubscribed(id, { actorId: profile.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to unsubscribe: ${msg}` };
  }

  await auditUpdate(
    'subscriber',
    id,
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );

  revalidatePath('/admin/newsletter');

  return { ok: true };
}

// ─── Resubscribe ──────────────────────────────────────────────────────────────

/**
 * Resubscribe a subscriber (clears unsubscribed_at).
 * Admin-only.
 */
export async function resubscribeSubscriberAction(
  id: string,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const before = await getSubscriberById(id);
  if (!before) {
    return { ok: false, error: 'Subscriber not found.' };
  }

  let after;
  try {
    after = await resubscribeSubscriber(id, { actorId: profile.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to resubscribe: ${msg}` };
  }

  await auditUpdate(
    'subscriber',
    id,
    before as unknown as Record<string, unknown>,
    after as unknown as Record<string, unknown>,
  );

  revalidatePath('/admin/newsletter');

  return { ok: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a subscriber by id.
 * Admin-only. User stays on the list page after deletion.
 */
export async function deleteSubscriberAction(
  id: string,
): Promise<ActionState> {
  await requireAdmin();

  const before = await getSubscriberById(id);
  if (!before) {
    return { ok: false, error: 'Subscriber not found.' };
  }

  try {
    await deleteSubscriber(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete subscriber: ${msg}` };
  }

  await auditDelete(
    'subscriber',
    id,
    before as unknown as Record<string, unknown>,
  );

  revalidatePath('/admin/newsletter');

  return { ok: true };
}
