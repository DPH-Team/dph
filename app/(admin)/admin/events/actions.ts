'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { tapTakeoverSchema } from '@/lib/validators/integrations';
import { updateUntappdFeaturedBrewery } from '@/lib/db/queries/integrations';
import { createAdminClient } from '@/lib/supabase/admin';
import { auditCreate, auditDelete, auditUpdate } from '@/lib/audit';
import {
  createTakeover,
  deleteTakeover,
  getTakeoverById,
  TakeoverDateConflictError,
} from '@/lib/db/queries/tap-takeovers';
import {
  createTakeoverSchema,
  deleteTakeoverSchema,
} from '@/lib/validators/tap-takeovers';
import type { ActionState } from '@/lib/types/action-state';
import type { Integration } from '@/lib/db/schema';

// ─── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Strip credential bytes from an integration row before diffing.
 * The credentials column is bytea — never pass it to the audit log.
 */
function sanitizeRow(row: Integration): Record<string, unknown> {
  return {
    name: row.name,
    enabled: row.enabled,
    mode: row.mode,
    // credentials intentionally omitted — auditUpdate's masker handles the key
    // name, but bytea is not serializable anyway.
    config: row.config,
    lastTestedAt: row.lastTestedAt,
    lastTestStatus: row.lastTestStatus,
    lastTestError: row.lastTestError,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

// ─── Tap Takeover: set featured brewery ───────────────────────────────────────

/**
 * updateTapTakeoverAction — persist the featured brewery selection for the Tap
 * Takeover feature.
 *
 * Gated with requireStaff() (staff and admin both permitted). All reads and
 * writes of the `untappd` integrations row go through the service-role admin
 * client because RLS restricts SELECT/UPDATE on integrations to admins only;
 * staff sessions would be denied under the user-session client. The featured
 * brewery value (config.featured_brewery) is non-secret and the action is
 * fully audited, so service-role access is acceptable here.
 *
 * An empty string or null clears the takeover (no brewery featured).
 * A non-empty string designates the brewery: every live tap whose brewery
 * matches (case-insensitive, trimmed) will receive isFeatured=true and float
 * to the top of the tap list without waiting for the Untappd cache to expire.
 *
 * Audit action: integration.update (diff on config.featured_brewery)
 * Revalidation: 'taps' tag + /taps path + /admin/events path.
 */
export async function updateTapTakeoverAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    featured_brewery: formData.get('featured_brewery') ?? '',
  };

  const result = tapTakeoverSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Validation failed.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Read the before-state via service-role so a staff session (denied by RLS
  // on the integrations table) can still retrieve the current config.
  const admin = createAdminClient();
  const { data: beforeData, error: beforeError } = await admin
    .from('integrations')
    .select('config')
    .eq('name', 'untappd')
    .single();

  if (beforeError || !beforeData) {
    return { ok: false, error: "Integration 'untappd' not found." };
  }

  // We need the full row for the audit diff — fetch it so sanitizeRow can work.
  const { data: beforeRow, error: beforeRowError } = await admin
    .from('integrations')
    .select('*')
    .eq('name', 'untappd')
    .single();

  if (beforeRowError || !beforeRow) {
    return { ok: false, error: "Integration 'untappd' not found." };
  }

  // Derive the before/after brewery values for the audit diff.
  const beforeConfig =
    beforeData.config &&
    typeof beforeData.config === 'object' &&
    !Array.isArray(beforeData.config)
      ? (beforeData.config as Record<string, unknown>)
      : {};
  const breweryBefore =
    typeof beforeConfig['featured_brewery'] === 'string'
      ? beforeConfig['featured_brewery']
      : null;

  const breweryAfter = result.data.featured_brewery.trim() || null;

  let after: Integration;
  try {
    after = await updateUntappdFeaturedBrewery(breweryAfter, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save tap takeover config: ${msg}` };
  }

  await auditUpdate(
    'integration',
    'untappd',
    sanitizeRow(beforeRow as Integration),
    sanitizeRow(after),
    { action: 'tap_takeover_updated', featured_brewery: { before: breweryBefore, after: breweryAfter } },
  );

  // Bust the taps cache so the public list reflects the change immediately.
  revalidateTag('taps', 'max');
  revalidatePath('/taps');
  revalidatePath('/admin/events');
  return { ok: true };
}

// ─── Scheduled tap takeovers: create ─────────────────────────────────────────

/**
 * createScheduledTakeoverAction — schedule a brewery for a future date.
 *
 * Gated with requireStaff(). Validates with createTakeoverSchema, calls
 * createTakeover, and writes to audit_log. Surfacing a friendly field error
 * when TakeoverDateConflictError is thrown (date already booked).
 *
 * Revalidates: 'taps' tag + /taps path + /admin/events path.
 */
export async function createScheduledTakeoverAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    brewery: formData.get('brewery') ?? '',
    date: formData.get('date') ?? '',
  };

  const result = createTakeoverSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  let row;
  try {
    row = await createTakeover(
      { brewery: result.data.brewery, date: result.data.date },
      profile.id,
    );
  } catch (err) {
    if (err instanceof TakeoverDateConflictError) {
      return {
        ok: false,
        error: err.message,
        fieldErrors: { date: [err.message] },
      };
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to schedule takeover: ${msg}` };
  }

  await auditCreate('tap_takeover', row.id, {
    brewery: row.brewery,
    date: row.date,
  });

  revalidateTag('taps', 'max');
  revalidatePath('/taps');
  revalidatePath('/admin/events');
  return { ok: true };
}

// ─── Scheduled tap takeovers: delete ─────────────────────────────────────────

/**
 * deleteScheduledTakeoverAction — remove a scheduled tap takeover by id.
 *
 * Accepts formData with an `id` field (UUID). Gated with requireStaff().
 * Fetches the before-state for the audit log, deletes the row, then writes
 * to audit_log.
 *
 * Revalidates: 'taps' tag + /taps path + /admin/events path.
 */
export async function deleteScheduledTakeoverAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = { id: formData.get('id') ?? '' };

  const result = deleteTakeoverSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid takeover id.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { id } = result.data;

  const before = await getTakeoverById(id);
  if (!before) {
    return { ok: false, error: 'Takeover not found — it may have already been deleted.' };
  }

  try {
    await deleteTakeover(id, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete takeover: ${msg}` };
  }

  await auditDelete('tap_takeover', id, {
    brewery: before.brewery,
    date: before.date,
  });

  revalidateTag('taps', 'max');
  revalidatePath('/taps');
  revalidatePath('/admin/events');
  return { ok: true };
}
