/**
 * lib/integrations/test-connections.ts
 *
 * Credential-verification helpers for Untappd and Printify.
 * Scoped to Phase 4 only — do NOT import from lib/untappd.ts or lib/printify.ts,
 * which are Phase 6 fetcher files and do not exist yet.
 *
 * Phase 6 may need to adjust the exact Untappd endpoint once the live API shape
 * is confirmed. See the comment on testUntappdConnection below.
 */

import 'server-only';

// ─── Shared timeout helper ─────────────────────────────────────────────────────

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

// ─── Untappd ──────────────────────────────────────────────────────────────────

/**
 * Verify Untappd credentials by calling the Untappd for Business menu endpoint.
 *
 * ASSUMPTION (Phase 4): We use GET /api/v1/menus?location_id={id} with a
 * Bearer token. The actual shape may differ slightly when the Phase 6 team
 * exercises the full API — Phase 6 should adjust lib/untappd.ts independently;
 * this file only needs to verify auth succeeds (2xx) vs fails (401/403).
 *
 * 401/403 = bad token or location ID.
 * 404 = endpoint shape wrong but auth may still be valid (we still report failure
 *   since we cannot confirm the creds work without a known-good endpoint).
 * Other non-2xx = upstream problem.
 */
export async function testUntappdConnection(creds: {
  location_id: string;
  read_write_token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `https://business.untappd.com/api/v1/menus?location_id=${encodeURIComponent(creds.location_id)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.read_write_token}`,
        Accept: 'application/json',
      },
      signal: withTimeout(5_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Network error: ${msg}` };
  }

  if (res.ok) {
    return { ok: true };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      error: 'Authentication failed (check token / location ID)',
    };
  }

  return { ok: false, error: `Untappd returned ${res.status}` };
}

// ─── Printify ─────────────────────────────────────────────────────────────────

/**
 * Verify Printify credentials by listing shops and confirming the given shop_id
 * is present. Printify shop IDs are numeric; we compare as strings.
 */
export async function testPrintifyConnection(creds: {
  api_key: string;
  shop_id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = 'https://api.printify.com/v1/shops.json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.api_key}`,
        'User-Agent': 'District-Pour-Haus/1.0',
        Accept: 'application/json',
      },
      signal: withTimeout(5_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Network error: ${msg}` };
  }

  if (res.status === 401) {
    return { ok: false, error: 'Invalid API key' };
  }

  if (!res.ok) {
    return { ok: false, error: `Printify returned ${res.status}` };
  }

  let shops: unknown;
  try {
    shops = await res.json();
  } catch {
    return { ok: false, error: 'Failed to parse Printify response' };
  }

  if (!Array.isArray(shops)) {
    return { ok: false, error: 'Unexpected Printify response shape' };
  }

  // Printify shop IDs are numeric in the API; compare as string for flexibility.
  const found = shops.some(
    (s: unknown) =>
      s !== null &&
      typeof s === 'object' &&
      'id' in s &&
      String((s as Record<string, unknown>).id) === creds.shop_id,
  );

  if (!found) {
    return {
      ok: false,
      error: `API key valid but shop_id ${creds.shop_id} not found in your shops`,
    };
  }

  return { ok: true };
}
