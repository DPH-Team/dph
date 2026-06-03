/**
 * app/api/checkins/route.ts
 *
 * Public GET endpoint returning the 15 most recent Untappd check-ins.
 * The homepage ticker polls this route every 5 minutes via client-side fetch.
 *
 * Response:
 *   200 { checkins: Checkin[]; stale: boolean }
 *
 * stale=true means the live Untappd fetch failed and mock/cached data is served.
 * The client may show a subtle indicator but must never blank the UI.
 *
 * No auth required — check-in data is public (names + beer info only).
 * Token is never exposed: fetchCheckins() is server-only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { fetchCheckins } from '@/lib/untappd';

export async function GET(): Promise<Response> {
  const { data: checkins, stale } = await fetchCheckins();

  return Response.json({ checkins, stale });
}
