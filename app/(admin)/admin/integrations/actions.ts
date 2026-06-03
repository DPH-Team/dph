'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  getCredentialsSchema,
  integrationTogglesSchema,
  plausibleConfigSchema,
  resendConfigSaveSchema,
  instagramConfigSaveSchema,
} from '@/lib/validators/integrations';
import type { IntegrationName } from '@/lib/validators/integrations';
import {
  getIntegration,
  setIntegrationCredentials,
  updateIntegrationToggles,
  updatePlausibleConfig,
  updateResendConfig,
  updateInstagramConfig,
  decryptCredentials,
  recordTestResult,
} from '@/lib/db/queries/integrations';
import { auditUpdate, auditIntegrationTest, audit } from '@/lib/audit';
import {
  testUntappdConnection,
  testPrintifyConnection,
  testResendConnection,
} from '@/lib/integrations/test-connections';
import { runEventsSync } from '@/lib/untappd-sync';
import { runMerchSync } from '@/lib/printify-sync';
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

// ─── Save credentials ─────────────────────────────────────────────────────────

/**
 * Save (encrypt + store) credentials for the named integration.
 *
 * Decision: if ALL credential fields are blank, we skip the SQL call and return
 * early with ok:true. This allows the user to submit the form without touching
 * credentials when they only want to change mode/enabled. The "keep existing"
 * path is implemented here (not in the validator) because the validator enforces
 * non-empty for fresh saves; the blank-means-skip logic is action-level UX.
 */
export async function saveCredentialsAction(
  name: IntegrationName,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();

  if (name === 'plausible') {
    return { ok: false, error: 'Plausible does not use credentials. Use savePlausibleConfigAction instead.' };
  }

  if (name === 'instagram') {
    return { ok: false, error: 'Instagram does not use credentials. Use saveInstagramConfigAction instead.' };
  }

  const schema = getCredentialsSchema(name as Exclude<IntegrationName, 'plausible' | 'instagram'>);
  const fields = Object.keys(schema.shape) as string[];

  // Check if all credential fields are blank — if so, skip the save.
  const allBlank = fields.every((field) => {
    const val = formData.get(field);
    return val === null || (typeof val === 'string' && val.trim() === '');
  });

  if (allBlank) {
    // Nothing to save — this is a no-op, not an error.
    return { ok: true };
  }

  const raw: Record<string, unknown> = {};
  for (const field of fields) {
    raw[field] = formData.get(field) ?? '';
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Validation failed.',
      fieldErrors: result.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const before = await getIntegration(name);
  if (!before) {
    return { ok: false, error: `Integration '${name}' not found.` };
  }

  let after: Integration;
  try {
    after = await setIntegrationCredentials(
      name,
      result.data as Record<string, unknown>,
      profile.id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save credentials: ${msg}` };
  }

  // Audit: pass sanitized rows — credentials are never included in the diff.
  await auditUpdate(
    'integration',
    name,
    sanitizeRow(before),
    sanitizeRow(after),
    { action: 'credentials_saved' },
  );

  revalidatePath('/admin/integrations');
  return { ok: true };
}

// ─── Update mode / enabled ────────────────────────────────────────────────────

/**
 * Update the enabled flag and mode for the named integration.
 * This is a deliberate, separately-auditable action from credential saves.
 */
export async function updateTogglesAction(
  name: IntegrationName,
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const raw = {
    // Checkbox: present = true, absent = false
    enabled: formData.get('enabled') === 'true',
    mode: formData.get('mode'),
  };

  const result = integrationTogglesSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid mode or enabled value.',
      fieldErrors: result.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const before = await getIntegration(name);
  if (!before) {
    return { ok: false, error: `Integration '${name}' not found.` };
  }

  let after: Integration;
  try {
    after = await updateIntegrationToggles(
      name,
      { enabled: result.data.enabled, mode: result.data.mode },
      profile.id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update settings: ${msg}` };
  }

  await auditUpdate(
    'integration',
    name,
    sanitizeRow(before),
    sanitizeRow(after),
    { action: 'toggles_updated' },
  );

  revalidatePath('/admin/integrations');
  return { ok: true };
}

// ─── Test connection ──────────────────────────────────────────────────────────

/**
 * Extended action state that includes a success message so the client can
 * display specific feedback beyond ok:true.
 */
export type TestActionState =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Decrypt credentials, run the appropriate test helper, record the result,
 * and audit-log the test event.
 */
export async function testConnectionAction(
  name: IntegrationName,
): Promise<TestActionState> {
  await requireAdmin();

  // Plausible and Instagram have no encrypted credentials to test.
  if (name === 'plausible') {
    return {
      ok: false,
      error: 'Plausible does not support connection testing — it has no server-side credentials.',
    };
  }

  if (name === 'instagram') {
    return {
      ok: false,
      error: 'Instagram does not support connection testing — it uses a public Behold feed ID with no server-side credentials.',
    };
  }

  // Decrypt credentials via service-role client.
  const creds = await decryptCredentials(name);

  if (creds === null) {
    return {
      ok: false,
      error: 'Could not decrypt credentials. Check INTEGRATIONS_ENCRYPTION_KEY.',
    };
  }

  const isEmpty =
    typeof creds === 'object' && Object.keys(creds).length === 0;
  if (isEmpty) {
    return { ok: false, error: 'No credentials set — save credentials first.' };
  }

  let testResult: { ok: true } | { ok: false; error: string };

  if (name === 'untappd') {
    const { email, location_id, read_write_token } = creds as {
      email: string;
      location_id: string;
      read_write_token: string;
    };
    testResult = await testUntappdConnection({ email, location_id, read_write_token });
  } else if (name === 'resend') {
    const { api_key } = creds as { api_key: string };
    testResult = await testResendConnection({ api_key });
  } else {
    const { api_key, shop_id } = creds as {
      api_key: string;
      shop_id: string;
    };
    testResult = await testPrintifyConnection({ api_key, shop_id });
  }

  const status = testResult.ok ? 'success' : 'failure';
  const errorMsg = testResult.ok ? undefined : testResult.error;

  // Record result + audit — both non-fatal if they fail.
  await recordTestResult(name, { status, error: errorMsg });
  await auditIntegrationTest(name, status, errorMsg);

  revalidatePath('/admin/integrations');

  if (testResult.ok) {
    return { ok: true, message: 'Connection successful.' };
  }
  return { ok: false, error: testResult.error };
}

// ─── Resend: save config ──────────────────────────────────────────────────────

/**
 * Persist Resend from_email + reply_to into the `config` jsonb column.
 * The api_key is handled separately by saveCredentialsAction (encrypted path).
 * Both fields must be valid email addresses when saving.
 */
export async function saveResendConfigAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const raw = {
    from_email: formData.get('from_email') ?? '',
    reply_to: formData.get('reply_to') ?? '',
  };

  const result = resendConfigSaveSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Validation failed.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await getIntegration('resend');
  if (!before) {
    return { ok: false, error: "Integration 'resend' not found." };
  }

  let after: Integration;
  try {
    after = await updateResendConfig(result.data, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save Resend config: ${msg}` };
  }

  await auditUpdate(
    'integration',
    'resend',
    sanitizeRow(before),
    sanitizeRow(after),
    { action: 'resend_config_saved' },
  );

  revalidatePath('/admin/integrations');
  return { ok: true };
}

// ─── Resend: enabled toggle ───────────────────────────────────────────────────

/**
 * Toggle Resend enabled/disabled.
 * Resend does not use mode; we pass the current mode through unchanged.
 */
export async function updateResendEnabledAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const enabled = formData.get('enabled') === 'true';

  const before = await getIntegration('resend');
  if (!before) {
    return { ok: false, error: "Integration 'resend' not found." };
  }

  let after: Integration;
  try {
    after = await updateIntegrationToggles(
      'resend',
      { enabled, mode: before.mode },
      profile.id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update Resend settings: ${msg}` };
  }

  await auditUpdate(
    'integration',
    'resend',
    sanitizeRow(before),
    sanitizeRow(after),
    { action: 'resend_enabled_toggled' },
  );

  revalidatePath('/admin/integrations');
  return { ok: true };
}

// ─── Plausible: save config ───────────────────────────────────────────────────

/**
 * Persist Plausible domain + host into the `config` jsonb column.
 * Neither field is a secret — they appear verbatim in the public script tag.
 * The enabled toggle is handled separately by updateTogglesAction.
 */
export async function savePlausibleConfigAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const raw = {
    domain: formData.get('domain') ?? '',
    host: formData.get('host') ?? 'https://plausible.io',
  };

  const result = plausibleConfigSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Validation failed.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await getIntegration('plausible');
  if (!before) {
    return { ok: false, error: "Integration 'plausible' not found." };
  }

  let after: Integration;
  try {
    after = await updatePlausibleConfig(result.data, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save Plausible config: ${msg}` };
  }

  await auditUpdate(
    'integration',
    'plausible',
    sanitizeRow(before),
    sanitizeRow(after),
    { action: 'plausible_config_saved' },
  );

  revalidatePath('/admin/integrations');
  return { ok: true };
}

// ─── Sync result types ────────────────────────────────────────────────────────

/**
 * Structured result for sync-now actions. The client toasts this directly.
 * success includes a human-readable summary (counts / "refreshed" / skipped).
 */
export type SyncActionState =
  | { ok: true; message: string }
  | { ok: false; error: string };

// ─── Untappd: sync now ────────────────────────────────────────────────────────

/**
 * syncUntappdNowAction — admin-only manual sync trigger for Untappd.
 *
 * Delegates to runEventsSync() (the same function the Vercel Cron calls) which:
 *   1. Calls fetchEvents() — skips DB write on upstream failure.
 *   2. Maps events to rows and upserts into events_cache.
 *   3. Soft-deletes removed events.
 *   4. Calls revalidateTag('events','max').
 *
 * Additionally busts the taps cache (revalidateTag('taps')) so the tap list
 * also refreshes in case menu items changed since the last auto-refresh.
 *
 * Audit action: integration.untappd_sync_now
 */
export async function syncUntappdNowAction(): Promise<SyncActionState> {
  await requireAdmin();

  const result = await runEventsSync();

  // Bust taps cache on top of the events cache bust inside runEventsSync().
  // This forces a fresh traversal of menus/sections/items on the next tap-list
  // RSC render, regardless of whether the events sync succeeded.
  revalidateTag('taps', 'max');

  // Audit — non-fatal; failures are logged by the audit helper itself.
  if (result.ok) {
    await audit(
      'integration.untappd_sync_now',
      'integration',
      'untappd',
      { upserted: result.upserted },
    );
  } else {
    await audit(
      'integration.untappd_sync_now',
      'integration',
      'untappd',
      {
        ok: false,
        skipped: result.skipped,
        reason: result.reason,
      },
    );
  }

  revalidatePath('/admin/integrations');

  if (result.ok) {
    const noun = result.upserted === 1 ? 'event' : 'events';
    return {
      ok: true,
      message:
        result.upserted === 0
          ? 'Sync complete — no new or changed events.'
          : `Sync complete — ${result.upserted} ${noun} refreshed.`,
    };
  }

  if (result.skipped) {
    return {
      ok: false,
      error: `Sync skipped — Untappd upstream unavailable: ${result.reason}`,
    };
  }

  return {
    ok: false,
    error: `Sync failed — could not write to database: ${result.reason}`,
  };
}

// ─── Printify: sync now ───────────────────────────────────────────────────────

/**
 * syncPrintifyNowAction — admin-only manual sync trigger for Printify.
 *
 * Delegates to runMerchSync() (the same function the Vercel Cron calls) which:
 *   1. Calls fetchLiveProducts() — skips DB write on upstream failure or mock mode.
 *   2. Downloads new/changed product images into Supabase Storage.
 *   3. Upserts all product rows into merch_products.
 *   4. Soft-deletes products no longer reported by Printify (and their storage objects).
 *   5. Calls revalidateTag('merch','max').
 *
 * Audit action: integration.printify_sync_now
 */
export async function syncPrintifyNowAction(): Promise<SyncActionState> {
  await requireAdmin();

  const result = await runMerchSync();

  // Audit — non-fatal; failures are logged by the audit helper itself.
  if (result.ok) {
    await audit(
      'integration.printify_sync_now',
      'integration',
      'printify',
      {
        ok: true,
        upserted: result.upserted,
        downloaded: result.downloaded,
        softDeleted: result.softDeleted,
      },
    );
  } else {
    await audit(
      'integration.printify_sync_now',
      'integration',
      'printify',
      {
        ok: false,
        skipped: result.skipped,
        reason: result.reason,
      },
    );
  }

  revalidatePath('/admin/integrations');

  if (result.ok) {
    const productNoun = result.upserted === 1 ? 'product' : 'products';
    const imageNoun = result.downloaded === 1 ? 'image' : 'images';
    const parts: string[] = [`${result.upserted} ${productNoun} refreshed`];
    if (result.downloaded > 0) {
      parts.push(`${result.downloaded} ${imageNoun} mirrored`);
    }
    if (result.softDeleted > 0) {
      parts.push(`${result.softDeleted} removed`);
    }
    return {
      ok: true,
      message: `Sync complete — ${parts.join(', ')}.`,
    };
  }

  if (result.skipped) {
    return {
      ok: false,
      error: 'Sync skipped — Printify unavailable or in mock mode.',
    };
  }

  return {
    ok: false,
    error: `Sync failed — ${result.reason}`,
  };
}

// ─── Plausible: enabled toggle ────────────────────────────────────────────────

/**
 * Toggle Plausible enabled/disabled.
 * Plausible does not use mode; we pass the current mode through unchanged.
 */
export async function updatePlausibleEnabledAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const enabled = formData.get('enabled') === 'true';

  const before = await getIntegration('plausible');
  if (!before) {
    return { ok: false, error: "Integration 'plausible' not found." };
  }

  let after: Integration;
  try {
    after = await updateIntegrationToggles(
      'plausible',
      { enabled, mode: before.mode },
      profile.id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update Plausible settings: ${msg}` };
  }

  await auditUpdate(
    'integration',
    'plausible',
    sanitizeRow(before),
    sanitizeRow(after),
    { action: 'plausible_enabled_toggled' },
  );

  revalidatePath('/admin/integrations');
  return { ok: true };
}

// ─── Instagram: save config ───────────────────────────────────────────────────

/**
 * Persist Instagram (Behold) feed_id + enabled into the `config` jsonb column.
 * The feed_id is a non-secret public identifier — it is NOT stored in the
 * encrypted credentials column. The enabled toggle is saved in the same call.
 *
 * Validates with instagramConfigSaveSchema (requires non-empty feed_id).
 * Writes to audit_log — mandatory per project rules.
 */
export async function saveInstagramConfigAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireAdmin();

  const raw = {
    feed_id: formData.get('feed_id') ?? '',
    enabled: formData.get('enabled') === 'true',
  };

  const result = instagramConfigSaveSchema.safeParse({ feed_id: raw.feed_id });
  if (!result.success) {
    return {
      ok: false,
      error: 'Validation failed.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const before = await getIntegration('instagram');
  if (!before) {
    return { ok: false, error: "Integration 'instagram' not found." };
  }

  const feedId = result.data.feed_id.trim();
  const mode: 'live' | 'mock' = raw.enabled && feedId !== '' ? 'live' : 'mock';

  let after: Integration;
  try {
    after = await updateInstagramConfig(
      { feed_id: result.data.feed_id },
      raw.enabled,
      mode,
      profile.id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save Instagram config: ${msg}` };
  }

  await auditUpdate(
    'integration',
    'instagram',
    sanitizeRow(before),
    sanitizeRow(after),
    { action: 'instagram_config_saved' },
  );

  revalidateTag('instagram');
  revalidatePath('/');
  revalidatePath('/admin/integrations');
  return { ok: true };
}
