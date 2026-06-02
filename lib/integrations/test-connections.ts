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
 * Verify Untappd credentials by calling the Untappd for Business menus endpoint.
 *
 * VERIFIED: Auth is HTTP Basic — header is:
 *   Authorization: Basic <base64(email + ":" + read_write_token)>
 * per official Untappd for Business API docs. Bearer auth is incorrect.
 *
 * Endpoint used: GET /api/v1/locations/{location_id}/menus
 * This is the location-scoped menus path that exercises BOTH auth credentials
 * AND the location ID in a single request.
 *
 * INFERRED (isolate for easy update): The menus sub-path
 * (/api/v1/locations/{id}/menus) is not 100% confirmed from public docs — if
 * a real-creds test returns 404 change the path here only; the auth scheme
 * itself is verified.
 *
 * Status handling:
 *   2xx            → success
 *   401 / 403      → auth failed (bad email, token not Read & Write, or wrong account)
 *   404            → location not found or menus path wrong (check Location ID)
 *   other non-2xx  → upstream error
 */
export async function testUntappdConnection(creds: {
  email: string;
  location_id: string;
  read_write_token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const basicToken = Buffer.from(`${creds.email}:${creds.read_write_token}`).toString('base64');
  const url = `https://business.untappd.com/api/v1/locations/${encodeURIComponent(creds.location_id)}/menus`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicToken}`,
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
      error:
        'Authentication failed — check email, token, and that you are using the Read & Write token',
    };
  }

  if (res.status === 404) {
    return {
      ok: false,
      error: 'Location not found or menus endpoint unavailable — check your Location ID',
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
