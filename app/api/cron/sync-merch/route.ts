/**
 * app/api/cron/sync-merch/route.ts
 *
 * Scheduled cron handler: delegates to runMerchSync() (lib/printify-sync.ts)
 * which fetches products from Printify, mirrors their images into Supabase
 * Storage, upserts the merch_products table, soft-deletes removed products
 * (and their storage objects), and revalidates the public ISR 'merch' cache tag.
 *
 * This route owns only two concerns:
 *   1. CRON_SECRET Bearer-token authentication.
 *   2. Translating the MerchSyncResult into an HTTP response.
 *
 * The admin "Sync now" button calls runMerchSync() directly via a server action,
 * so both paths share a single code path. See lib/printify-sync.ts for details.
 *
 * Invoked every 5 minutes by Vercel Cron (see vercel.json).
 * Secured with a Bearer token that Vercel injects automatically when
 * CRON_SECRET is set in the project environment variables.
 *
 * Outage-safe: any error from fetchLiveProducts() causes runMerchSync() to
 * return { ok: false, skipped: true } and leave the DB untouched.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { runMerchSync } from '@/lib/printify-sync';

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  // ── Security: require Bearer CRON_SECRET ────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[sync-merch] CRON_SECRET env var is not set — rejecting request');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (token !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Delegate sync to shared helper ─────────────────────────────────────────
  const result = await runMerchSync();

  // Preserve the response contract:
  //   { ok: true, upserted: number, downloaded: number, softDeleted: number }
  //   { ok: false, skipped: true, reason: string }
  //   { ok: false, skipped: false, reason: string }
  // All responses are HTTP 200 — the cron scheduler does not retry on non-2xx.
  return Response.json(result);
}
