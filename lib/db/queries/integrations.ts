/**
 * lib/db/queries/integrations.ts — DB helpers for the integrations table.
 *
 * Regular reads/writes use the user-session Drizzle client (`db`) so RLS
 * policies apply. Credential encryption/decryption uses the service-role
 * admin client because set_integration_credentials / get_integration_credentials
 * are SECURITY DEFINER functions granted only to service_role.
 */

import 'server-only';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Integration } from '@/lib/db/schema';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Return all integration rows in deterministic order (untappd, printify, plausible, resend).
 * RLS enforces admin-only access.
 */
export async function listIntegrations(): Promise<Integration[]> {
  return db
    .select()
    .from(integrations)
    .orderBy(
      sql`CASE ${integrations.name} WHEN 'untappd' THEN 0 WHEN 'printify' THEN 1 WHEN 'plausible' THEN 2 WHEN 'resend' THEN 3 ELSE 4 END`,
    );
}

// ─── Get by name ──────────────────────────────────────────────────────────────

/**
 * Fetch a single integration row by name. Returns null if not found.
 */
export async function getIntegration(
  name: string,
): Promise<Integration | null> {
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.name, name))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Set credentials ──────────────────────────────────────────────────────────

/**
 * Encrypt and store credentials for the given integration.
 *
 * IMPORTANT: Requires INTEGRATIONS_ENCRYPTION_KEY env var. Throws a clear
 * error if the key is missing — do not pass a fallback, as that would silently
 * store credentials with a weak/empty key.
 *
 * Implementation note: the SQL function set_integration_credentials handles
 * encryption and stamps updated_at. We then update updated_by in a separate
 * Drizzle call (the SQL function does not know the actor ID).
 */
export async function setIntegrationCredentials(
  name: string,
  plaintext: Record<string, unknown>,
  actorId: string,
): Promise<Integration> {
  const key = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'Missing env var: INTEGRATIONS_ENCRYPTION_KEY. ' +
        'Generate one with: openssl rand -base64 32',
    );
  }

  // Use the service-role admin client — the SQL function is granted only to
  // service_role; the user-session client cannot call it.
  const admin = createAdminClient();
  const { error: rpcError } = await admin.rpc('set_integration_credentials', {
    p_name: name,
    p_plaintext: plaintext,
    p_key: key,
  });

  if (rpcError) {
    throw new Error(
      `set_integration_credentials RPC failed: ${rpcError.message}`,
    );
  }

  // Stamp updated_by (the SQL function only touches credentials + updated_at).
  const rows = await db
    .update(integrations)
    .set({ updatedBy: actorId, updatedAt: new Date() })
    .where(eq(integrations.name, name))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error(`setIntegrationCredentials: no row for name=${name}`);
  }
  return row;
}

// ─── Update toggles ───────────────────────────────────────────────────────────

/**
 * Update mode and/or enabled status for an integration.
 * Uses the user-session Drizzle client (RLS applies).
 */
export async function updateIntegrationToggles(
  name: string,
  updates: { enabled: boolean; mode: string },
  actorId: string,
): Promise<Integration> {
  const rows = await db
    .update(integrations)
    .set({
      enabled: updates.enabled,
      mode: updates.mode,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(integrations.name, name))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error(`updateIntegrationToggles: no row for name=${name}`);
  }
  return row;
}

// ─── Record test result ───────────────────────────────────────────────────────

/**
 * Stamp the test result on the integration row.
 * Uses the admin client so even a failed test (which may indicate the
 * user-session row access is broken) still records.
 */
export async function recordTestResult(
  name: string,
  result: { status: 'success' | 'failure'; error?: string },
): Promise<void> {
  // Use admin client to ensure the write always succeeds regardless of RLS state.
  const admin = createAdminClient();
  const { error } = await admin
    .from('integrations')
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_status: result.status,
      last_test_error: result.error ?? null,
    })
    .eq('name', name);

  if (error) {
    // Non-fatal — log but don't block the action response.
    console.error('[integrations] recordTestResult failed:', error.message);
  }
}

// ─── Plausible config (jsonb — not encrypted) ─────────────────────────────────

/**
 * Read the Plausible config from the `config` jsonb column.
 * Returns null if the row does not exist or config is missing expected shape.
 * Used by the public layout to decide whether to inject the script tag.
 *
 * Intentionally uses the service-role client so this can be called from a
 * server component without requiring an active user session (the public layout
 * runs for anonymous visitors).
 */
export async function getPlausibleConfig(): Promise<{
  enabled: boolean;
  domain: string;
  host: string;
} | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('integrations')
    .select('enabled, config')
    .eq('name', 'plausible')
    .single();

  if (error || !data) return null;

  const config =
    data.config &&
    typeof data.config === 'object' &&
    !Array.isArray(data.config)
      ? (data.config as Record<string, unknown>)
      : {};

  return {
    enabled: Boolean(data.enabled),
    domain: typeof config.domain === 'string' ? config.domain : '',
    host:
      typeof config.host === 'string' ? config.host : 'https://plausible.io',
  };
}

/**
 * Persist Plausible domain + host into the `config` jsonb column.
 * Does NOT touch the `credentials` column — Plausible has no secrets.
 * Uses the user-session Drizzle client so RLS applies (admin-only update).
 */
export async function updatePlausibleConfig(
  config: { domain: string; host: string },
  actorId: string,
): Promise<Integration> {
  const rows = await db
    .update(integrations)
    .set({
      config: config as unknown as Record<string, unknown>,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(integrations.name, 'plausible'))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error('updatePlausibleConfig: plausible integration row not found');
  }
  return row;
}

// ─── Resend config (jsonb — non-secret fields) + decrypted api_key ────────────

/**
 * Read the Resend config from the `config` jsonb column AND decrypt the api_key
 * from the encrypted `credentials` column.
 *
 * Returns null gracefully if the row does not exist, the encryption key is
 * absent, or decryption fails — callers must handle the null path.
 *
 * Uses the service-role client so the email layer can call this from server
 * components / actions without an active user session.
 *
 * NEVER log or send the return value to the client.
 */
export async function getResendConfig(): Promise<{
  enabled: boolean;
  apiKey: string;
  fromEmail: string;
  replyTo: string;
} | null> {
  try {
    const key = process.env.INTEGRATIONS_ENCRYPTION_KEY;
    if (!key) {
      console.error('[integrations] getResendConfig: INTEGRATIONS_ENCRYPTION_KEY is not set');
      return null;
    }

    const admin = createAdminClient();

    // Read config (non-secret jsonb) and enabled flag.
    const { data, error } = await admin
      .from('integrations')
      .select('enabled, config')
      .eq('name', 'resend')
      .single();

    if (error || !data) return null;

    const config =
      data.config &&
      typeof data.config === 'object' &&
      !Array.isArray(data.config)
        ? (data.config as Record<string, unknown>)
        : {};

    // Decrypt api_key via the SECURITY DEFINER RPC.
    const { data: creds, error: rpcError } = await admin.rpc(
      'get_integration_credentials',
      { p_name: 'resend', p_key: key },
    );

    if (rpcError) {
      console.error('[integrations] getResendConfig: decrypt RPC failed:', rpcError.message);
      return null;
    }

    const credObj =
      creds !== null && typeof creds === 'object' && !Array.isArray(creds)
        ? (creds as Record<string, unknown>)
        : {};

    return {
      enabled: Boolean(data.enabled),
      apiKey: typeof credObj.api_key === 'string' ? credObj.api_key : '',
      fromEmail: typeof config.from_email === 'string' ? config.from_email : '',
      replyTo: typeof config.reply_to === 'string' ? config.reply_to : '',
    };
  } catch (err) {
    console.error('[integrations] getResendConfig failed:', err);
    return null;
  }
}

/**
 * Persist Resend from_email + reply_to into the `config` jsonb column.
 * Does NOT touch the `credentials` column — api_key goes through the encrypted
 * credential write path (setIntegrationCredentials).
 * Uses the user-session Drizzle client so RLS applies (admin-only update).
 */
export async function updateResendConfig(
  config: { from_email: string; reply_to: string },
  actorId: string,
): Promise<Integration> {
  const rows = await db
    .update(integrations)
    .set({
      config: config as unknown as Record<string, unknown>,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(integrations.name, 'resend'))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error('updateResendConfig: resend integration row not found');
  }
  return row;
}

// ─── Instagram config (jsonb — not encrypted) ─────────────────────────────────

/**
 * Persist Instagram feed_id into the `config` jsonb column and update `enabled`.
 * Behold feed_id is a non-secret public identifier — no encryption needed.
 * Uses the user-session Drizzle client so RLS applies (admin-only update).
 */
export async function updateInstagramConfig(
  config: { feed_id: string },
  enabled: boolean,
  actorId: string,
): Promise<Integration> {
  const rows = await db
    .update(integrations)
    .set({
      config: config as unknown as Record<string, unknown>,
      enabled,
      updatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(integrations.name, 'instagram'))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error('updateInstagramConfig: instagram integration row not found');
  }
  return row;
}

// ─── Decrypt credentials ──────────────────────────────────────────────────────

/**
 * Decrypt and return the stored credentials for the given integration.
 *
 * IMPORTANT: Requires INTEGRATIONS_ENCRYPTION_KEY env var. Returns null if
 * the key is missing or if decryption fails (e.g. key mismatch after rotation).
 * Returns {} if no credentials have been set yet.
 *
 * Never log or serialize the return value to the client.
 */
export async function decryptCredentials(
  name: string,
): Promise<Record<string, unknown> | null> {
  const key = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!key) {
    // Missing key is an environment misconfiguration — return null so callers
    // can surface a "No encryption key configured" error rather than crashing.
    console.error(
      '[integrations] decryptCredentials: INTEGRATIONS_ENCRYPTION_KEY is not set',
    );
    return null;
  }

  // Use the service-role admin client — the SQL function is granted only to
  // service_role; the user-session client cannot call it.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('get_integration_credentials', {
    p_name: name,
    p_key: key,
  });

  if (error) {
    console.error(
      '[integrations] get_integration_credentials RPC failed:',
      error.message,
    );
    return null;
  }

  // The SQL function returns {} if no creds are set, null on decryption failure.
  if (data === null) return null;

  // PostgREST returns the jsonb directly as a parsed object.
  return data as Record<string, unknown>;
}
