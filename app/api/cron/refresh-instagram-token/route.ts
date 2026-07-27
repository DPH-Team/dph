/**
 * app/api/cron/refresh-instagram-token/route.ts
 *
 * Scheduled cron handler: delegates to runInstagramTokenRefresh()
 * (lib/instagram-refresh.ts) which reads the stored long-lived token, checks
 * whether it is due for renewal (< 21 days remaining, > 24h old), calls the
 * Graph API /refresh_access_token endpoint, persists the new token + expiry,
 * and revalidates the public instagram cache tag.
 *
 * This route owns only two concerns:
 *   1. CRON_SECRET Bearer-token authentication.
 *   2. Translating the InstagramRefreshResult into an HTTP response.
 *
 * Invoked once daily by Vercel Cron (see vercel.json).
 * Secured with a Bearer token that Vercel injects automatically when
 * CRON_SECRET is set in the project environment variables.
 *
 * All responses are HTTP 200 — the cron scheduler does not retry on non-2xx.
 * The token is NEVER logged or included in any response payload.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { timingSafeEqual } from 'node:crypto';
import { runInstagramTokenRefresh } from '@/lib/instagram-refresh';

/** Constant-time string comparison — prevents timing attacks on the secret. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  // ── Security: require Bearer CRON_SECRET ────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[refresh-instagram-token] CRON_SECRET env var is not set — rejecting request');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!safeEqual(token, cronSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Delegate to shared refresh helper ──────────────────────────────────────
  const result = await runInstagramTokenRefresh();

  // All responses are HTTP 200.
  return Response.json(result);
}
