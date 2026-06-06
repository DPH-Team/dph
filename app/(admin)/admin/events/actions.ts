'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { tapTakeoverSchema } from '@/lib/validators/integrations';
import { updateUntappdFeaturedBrewery } from '@/lib/db/queries/integrations';
import { createAdminClient } from '@/lib/supabase/admin';
import { auditUpdate } from '@/lib/audit';
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
