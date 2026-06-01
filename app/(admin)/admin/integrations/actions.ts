'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  getCredentialsSchema,
  integrationTogglesSchema,
} from '@/lib/validators/integrations';
import type { IntegrationName } from '@/lib/validators/integrations';
import {
  getIntegration,
  setIntegrationCredentials,
  updateIntegrationToggles,
  decryptCredentials,
  recordTestResult,
} from '@/lib/db/queries/integrations';
import { auditUpdate, auditIntegrationTest } from '@/lib/audit';
import {
  testUntappdConnection,
  testPrintifyConnection,
} from '@/lib/integrations/test-connections';
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

  const schema = getCredentialsSchema(name);
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
