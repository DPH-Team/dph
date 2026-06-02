/**
 * app/api/cron/sync-events/route.ts
 *
 * Scheduled cron handler: delegates to runEventsSync() (lib/untappd-sync.ts)
 * which fetches events from Untappd, upserts them into events_cache,
 * soft-deletes rows that are no longer reported, and revalidates the public
 * ISR 'events' cache tag.
 *
 * This route owns only two concerns:
 *   1. CRON_SECRET Bearer-token authentication.
 *   2. Translating the EventsSyncResult into an HTTP response.
 *
 * The admin "Sync now" button calls runEventsSync() directly via a server action,
 * so both paths share a single code path. See lib/untappd-sync.ts for details.
 *
 * Invoked every 5 minutes by Vercel Cron (see vercel.json).
 * Secured with a Bearer token that Vercel injects automatically when
 * CRON_SECRET is set in the project environment variables.
 *
 * Outage-safe: any error from fetchEvents() causes runEventsSync() to return
 * { ok: false, skipped: true } and leave the DB untouched.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { runEventsSync } from '@/lib/untappd-sync';

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  // ── Security: require Bearer CRON_SECRET ────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[sync-events] CRON_SECRET env var is not set — rejecting request');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (token !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Delegate sync to shared helper ─────────────────────────────────────────
  const result = await runEventsSync();

  // Preserve the original response contract:
  //   { ok: true, upserted: number }
  //   { ok: false, skipped: true, reason: string }
  //   { ok: false, skipped: false, reason: string }
  // All responses are HTTP 200 — the cron scheduler does not retry on non-2xx.
  return Response.json(result);
}
