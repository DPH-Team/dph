/**
 * lib/integrations/test-connections.ts
 *
 * Credential-verification helpers for Untappd, Printify, and Resend.
 * Scoped to Phase 4/7 only — do NOT import from lib/untappd.ts or lib/printify.ts,
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

// ─── Resend ───────────────────────────────────────────────────────────────────

/**
 * Verify a Resend API key by calling GET https://api.resend.com/domains.
 *
 * Status handling:
 *   2xx                        → key is valid
 *   401 + name=restricted_api_key → key is a sending-only key — VALID for our
 *                                   purposes (we only send email, never list
 *                                   domains). Treat as success. Do NOT "fix"
 *                                   this to ok:false — sending-only keys are
 *                                   intentionally restricted and work fine.
 *   401 + name=missing_api_key → auth header missing/empty → invalid key
 *   403 + name=invalid_api_key → key does not exist or revoked → invalid key
 *   other non-2xx              → upstream error
 *
 * The /domains endpoint is lightweight and has no side-effects.
 */
export async function testResendConnection(creds: {
  api_key: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = 'https://api.resend.com/domains';

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.api_key}`,
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

  // Parse the error body to distinguish Resend's named error codes.
  let errorName: string | undefined;
  try {
    const body = await res.json() as Record<string, unknown>;
    errorName = typeof body.name === 'string' ? body.name : undefined;
  } catch {
    // Non-JSON body — fall through to status-based handling below.
  }

  // A sending-only key is restricted from listing domains but sends email fine.
  // This is the intended scope for a key used only for transactional sends.
  if (errorName === 'restricted_api_key') {
    return { ok: true };
  }

  if (errorName === 'missing_api_key' || errorName === 'invalid_api_key') {
    return {
      ok: false,
      error:
        'Invalid API key — check the value starts with re_ and was copied in full',
    };
  }

  // Fallback: surface the HTTP status for any other non-2xx.
  return { ok: false, error: `Resend returned ${res.status}` };
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
 * Verify Printify credentials by listing shops (GET /v1/shops.json) and
 * confirming the given shop_id is present.
 *
 * VERIFIED response shape: the endpoint returns a plain JSON array of shop
 * objects — NOT a { data: [...] } envelope. Each item has at minimum:
 *   { id: number, title: string, sales_channel: string }
 *
 * We handle both shapes defensively (array OR { data: array }) in case the API
 * ever wraps its response.
 *
 * Required headers (both verified against Printify API):
 *   Authorization: Bearer <api_key>
 *   User-Agent: <non-empty string>   ← required; omitting it causes rejections
 *
 * Status handling:
 *   2xx + shop found  → success
 *   401               → bad API key (key does not exist or was revoked)
 *   403               → key exists but lacks permission (wrong scope/plan)
 *   429               → rate limited — back off and retry later
 *   other non-2xx     → upstream error
 *   shop not in list  → key valid but shop_id not associated with this account
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
        // User-Agent is required by the Printify API; omitting it leads to rejections.
        'User-Agent': 'District-Pour-Haus/1.0',
        Accept: 'application/json',
      },
      signal: withTimeout(8_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Network error: ${msg}` };
  }

  // Surface clear per-status errors before attempting JSON parse.
  if (res.status === 401) {
    return {
      ok: false,
      error: 'Invalid API key — the key does not exist or has been revoked',
    };
  }

  if (res.status === 403) {
    return {
      ok: false,
      error: 'Permission denied — check that the API key has the correct scopes',
    };
  }

  if (res.status === 429) {
    return {
      ok: false,
      error: 'Rate limited by Printify — wait a moment and try again',
    };
  }

  if (!res.ok) {
    return { ok: false, error: `Printify returned ${res.status}` };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: 'Failed to parse Printify response as JSON' };
  }

  // Normalise: accept a plain array OR a { data: [...] } paginated envelope.
  // The verified shape is a plain array, but we handle both defensively.
  let shopList: unknown[];
  if (Array.isArray(body)) {
    shopList = body;
  } else if (
    body !== null &&
    typeof body === 'object' &&
    Array.isArray((body as Record<string, unknown>)['data'])
  ) {
    shopList = (body as Record<string, unknown>)['data'] as unknown[];
  } else {
    return {
      ok: false,
      error: 'Unexpected Printify response shape — expected an array of shops',
    };
  }

  // Printify shop IDs are numeric in the API; compare as strings for flexibility
  // (the admin may have pasted a string shop_id from the dashboard URL).
  const found = shopList.some(
    (s: unknown) =>
      s !== null &&
      typeof s === 'object' &&
      'id' in s &&
      String((s as Record<string, unknown>).id) === creds.shop_id,
  );

  if (!found) {
    return {
      ok: false,
      error: `API key is valid but shop ID ${creds.shop_id} was not found on this account`,
    };
  }

  return { ok: true };
}
