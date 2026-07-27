/**
 * lib/instagram-refresh.ts — Instagram Graph API token refresh logic.
 *
 * Exports:
 *   runInstagramTokenRefresh()  Discriminated-union result (see type below).
 *
 * Called by:
 *   app/api/cron/refresh-instagram-token/route.ts  — Vercel Cron (daily)
 *
 * Refresh endpoint:
 *   GET https://graph.instagram.com/refresh_access_token
 *     ?grant_type=ig_refresh_token
 *     &access_token=<current_token>
 *
 * Guard rules (in order):
 *   1. Row disabled or no token stored         → { ok: true, refreshed: false, reason: 'disabled' | 'no_token' }
 *   2. token_obtained_at < 24h ago             → { ok: true, refreshed: false, reason: 'too_young' }
 *      (Meta rejects refresh of tokens minted within the last 24 hours)
 *   3. token_expires_at > 21 days from now     → { ok: true, refreshed: false, reason: 'not_due' }
 *   4. token_expires_at already passed         → { ok: false, reason: 'expired' }
 *      (unrefreshable — owner must paste a new token via the admin card)
 *   5. Otherwise: refresh, persist, audit.
 *
 * The token is NEVER logged or included in any audit payload.
 *
 * Structure mirrors lib/untappd-sync.ts conventions.
 */

import 'server-only';

import { revalidateTag } from 'next/cache';
import { getIntegration } from '@/lib/db/queries/integrations';
import {
  getInstagramTokenMeta,
  decryptCredentials,
  updateInstagramTokenAfterRefresh,
} from '@/lib/db/queries/integrations';
import { audit } from '@/lib/audit';

// ─── Result type ───────────────────────────────────────────────────────────────

export type InstagramRefreshResult =
  | { ok: true; refreshed: false; reason: 'disabled' | 'no_token' | 'too_young' | 'not_due' }
  | { ok: true; refreshed: true; newExpiresAt: string }
  | { ok: false; reason: 'expired' | 'fetch_failed' | 'db_failed'; detail?: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_24H = 24 * 60 * 60 * 1000;
const MS_21D = 21 * 24 * 60 * 60 * 1000;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * runInstagramTokenRefresh — refresh the Instagram long-lived token when due.
 *
 * Returns a discriminated-union result. HTTP 200 is always returned by the
 * cron route regardless of the result variant (the scheduler does not retry
 * on 4xx/5xx).
 *
 * Token is scrubbed from any error messages before logging or returning.
 */
export async function runInstagramTokenRefresh(): Promise<InstagramRefreshResult> {
  // ── 1. Read integration row ───────────────────────────────────────────────
  let row: Awaited<ReturnType<typeof getIntegration>>;
  try {
    row = await getIntegration('instagram');
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: 'db_failed', detail };
  }

  if (!row || !row.enabled || row.mode !== 'live') {
    return { ok: true, refreshed: false, reason: 'disabled' };
  }

  // ── 2. Check whether a token is stored ────────────────────────────────────
  let creds: Record<string, unknown> | null;
  try {
    creds = await decryptCredentials('instagram');
  } catch {
    return { ok: true, refreshed: false, reason: 'no_token' };
  }

  const currentToken =
    creds && typeof creds['access_token'] === 'string'
      ? creds['access_token'].trim()
      : '';

  if (!currentToken) {
    return { ok: true, refreshed: false, reason: 'no_token' };
  }

  // ── 3. Read token metadata ────────────────────────────────────────────────
  const { tokenObtainedAt, tokenExpiresAt } = await getInstagramTokenMeta();

  const now = Date.now();

  // Guard: too young — Meta rejects refresh of tokens minted < 24h ago.
  if (tokenObtainedAt) {
    const obtainedMs = new Date(tokenObtainedAt).getTime();
    if (!isNaN(obtainedMs) && now - obtainedMs < MS_24H) {
      return { ok: true, refreshed: false, reason: 'too_young' };
    }
  }

  // Guard: not due yet — more than 21 days of validity remaining.
  if (tokenExpiresAt) {
    const expiresMs = new Date(tokenExpiresAt).getTime();
    if (!isNaN(expiresMs)) {
      if (expiresMs < now) {
        // Already expired — cannot be refreshed; owner must paste a new token.
        return { ok: false, reason: 'expired' };
      }
      if (expiresMs - now > MS_21D) {
        return { ok: true, refreshed: false, reason: 'not_due' };
      }
    }
  }

  // ── 4. Refresh the token ───────────────────────────────────────────────────
  const refreshUrl =
    `https://graph.instagram.com/refresh_access_token` +
    `?grant_type=ig_refresh_token` +
    `&access_token=${encodeURIComponent(currentToken)}`;

  let refreshJson: unknown;
  try {
    const res = await fetch(refreshUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = `Graph API returned HTTP ${res.status}`;
      return { ok: false, reason: 'fetch_failed', detail };
    }

    refreshJson = await res.json();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    // Scrub the token from any error detail before returning.
    const detail = raw.replace(currentToken, '[REDACTED]');
    return { ok: false, reason: 'fetch_failed', detail };
  }

  // Parse the refresh response: { access_token, expires_in (seconds) }
  const resp =
    refreshJson && typeof refreshJson === 'object' && !Array.isArray(refreshJson)
      ? (refreshJson as Record<string, unknown>)
      : {};

  const newToken =
    typeof resp['access_token'] === 'string' ? resp['access_token'].trim() : '';
  const expiresIn =
    typeof resp['expires_in'] === 'number' ? resp['expires_in'] : 0;

  if (!newToken || expiresIn <= 0) {
    return {
      ok: false,
      reason: 'fetch_failed',
      detail: 'Unexpected response shape from Graph API refresh endpoint',
    };
  }

  const newExpiresAt = new Date(now + expiresIn * 1000).toISOString();

  // ── 5. Persist the refreshed token ────────────────────────────────────────
  try {
    await updateInstagramTokenAfterRefresh(newToken, newExpiresAt, null);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: 'db_failed', detail };
  }

  // ── 6. Bust the public feed cache ─────────────────────────────────────────
  revalidateTag('instagram', 'max');

  // ── 7. Audit — token is NEVER included ────────────────────────────────────
  await audit(
    'integration.instagram_token_refreshed',
    'integration',
    'instagram',
    { newExpiresAt },
  );

  return { ok: true, refreshed: true, newExpiresAt };
}
