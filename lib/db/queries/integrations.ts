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
 * Return both integration rows in deterministic order (untappd, printify).
 * RLS enforces admin-only access.
 */
export async function listIntegrations(): Promise<Integration[]> {
  return db
    .select()
    .from(integrations)
    .orderBy(sql`CASE ${integrations.name} WHEN 'untappd' THEN 0 ELSE 1 END`);
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
