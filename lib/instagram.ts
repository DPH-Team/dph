/**
 * lib/instagram.ts — Server-only Meta Graph API Instagram feed fetcher.
 *
 * Exports:
 *   fetchIgPosts()  Promise<{ data: IgPost[]; stale: boolean }>
 *
 * Mock/live precedence (first match wins):
 *   1. Integration row absent, disabled, or mode !== 'live'    → mock
 *   2. mode === 'live' but decrypted access_token is empty     → mock + warn
 *   3. access_token present                                    → live fetch
 *   4. Live fetch throws / non-2xx / timeout                   → graceful fallback (stale:true)
 *
 * Graph API endpoint:
 *   GET https://graph.instagram.com/me/media
 *     ?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp
 *     &limit=6
 *     &access_token=<token>
 *
 * Graph API envelope: { data: [...] }
 * Field names are snake_case: media_type, media_url, thumbnail_url.
 *
 * imageUrl strategy:
 *   - VIDEO           → thumbnail_url ?? media_url
 *   - IMAGE / CAROUSEL → media_url
 *
 * alt: first line of caption (before "\n"), trimmed; generic fallback if absent.
 *
 * Data cache: 600-second revalidation, tagged ['instagram'].
 * Token is NEVER logged or sent to the client.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { getIntegration } from '@/lib/db/queries/integrations';
import { decryptCredentials } from '@/lib/db/queries/integrations';
import { igPosts as mockPosts, INSTAGRAM_PROFILE_URL } from '@/app/__fixtures__/instagram';
import type { IgPost } from '@/lib/fixtures/types';

// ─── Credential/config resolution ─────────────────────────────────────────────

type InstagramMode =
  | { mode: 'mock' }
  | { mode: 'live'; accessToken: string };

/**
 * resolveInstagramMode — decision logic for fetchIgPosts.
 *
 * Live mode requires: row enabled, row.mode === 'live', and a non-empty
 * decrypted access_token from the encrypted credentials column.
 *
 * Returns mock mode whenever any condition is not met.
 */
async function resolveInstagramMode(): Promise<InstagramMode> {
  let row: Awaited<ReturnType<typeof getIntegration>>;
  try {
    row = await getIntegration('instagram');
  } catch {
    // DB unavailable — fall back to mock so the page still renders.
    return { mode: 'mock' };
  }

  if (!row || !row.enabled || row.mode !== 'live') {
    return { mode: 'mock' };
  }

  // Decrypt the access_token from the encrypted credentials column.
  let creds: Record<string, unknown> | null;
  try {
    creds = await decryptCredentials('instagram');
  } catch {
    return { mode: 'mock' };
  }

  const accessToken =
    creds && typeof creds['access_token'] === 'string'
      ? creds['access_token'].trim()
      : '';

  if (!accessToken) {
    console.warn('[instagram] mode=live but access_token is empty — falling back to mock');
    return { mode: 'mock' };
  }

  return { mode: 'live', accessToken };
}

// ─── Post normalisation ───────────────────────────────────────────────────────

/**
 * normalizePosts — maps Graph API media response to IgPost[].
 *
 * Handles Graph API envelope { data: [...] } and also top-level arrays
 * defensively. Limits to the 6 most recent (Graph returns newest-first when
 * limit=6 is specified).
 */
function normalizePosts(raw: unknown): IgPost[] {
  if (!raw) return [];

  // Resolve the posts array — Graph envelope is { data: [...] } but we also
  // accept a bare top-level array for resilience.
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (
    raw !== null &&
    typeof raw === 'object' &&
    Array.isArray((raw as Record<string, unknown>)['data'])
  ) {
    items = (raw as Record<string, unknown>)['data'] as unknown[];
  } else {
    return [];
  }

  // Take the 6 most recent.
  const slice = items.slice(0, 6);
  const results: IgPost[] = [];

  for (const item of slice) {
    if (!item || typeof item !== 'object') continue;

    const p = item as Record<string, unknown>;

    // id is required.
    if (!p['id'] || typeof p['id'] !== 'string') continue;

    const str = (v: unknown): string | null =>
      typeof v === 'string' && v.length > 0 ? v : null;

    // Graph API field names are snake_case.
    const mediaType = str(p['media_type']) ?? 'IMAGE';
    const mediaUrl = str(p['media_url']) ?? '';
    const thumbnailUrl = str(p['thumbnail_url']);

    // imageUrl strategy:
    //   VIDEO           → thumbnail_url first (first-frame preview), else media_url
    //   IMAGE / CAROUSEL → media_url
    let imageUrl: string;
    if (mediaType === 'VIDEO') {
      imageUrl = thumbnailUrl ?? mediaUrl;
    } else {
      imageUrl = mediaUrl;
    }

    // alt: first non-empty line of caption; generic fallback.
    const captionRaw = str(p['caption']);
    const captionFirstLine = captionRaw
      ? captionRaw.split('\n')[0]?.trim() ?? null
      : null;
    const alt =
      captionFirstLine && captionFirstLine.length > 0
        ? captionFirstLine.slice(0, 120) // cap length for alt attribute
        : 'Photo from District Pour Haus on Instagram';

    results.push({
      id: p['id'] as string,
      imageUrl,
      alt,
      profileUrl: INSTAGRAM_PROFILE_URL,
      permalink: str(p['permalink']) ?? INSTAGRAM_PROFILE_URL,
      caption: captionRaw,
    });
  }

  return results;
}

// ─── Cached live fetch ─────────────────────────────────────────────────────────

/**
 * getCachedIgPostsRaw — Next Data Cache wrapper around the live Graph API fetch.
 *
 * Throws on failure so failed responses are never cached.
 * Tagged ['instagram'] with 600-second revalidation.
 *
 * The access token is embedded in the URL — Next.js caches the result value,
 * not the URL, so the token is not persisted to the cache store.
 * Token is NOT logged under any circumstances.
 */
const getCachedIgPostsRaw = unstable_cache(
  async (accessToken: string): Promise<IgPost[]> => {
    const url =
      `https://graph.instagram.com/me/media` +
      `?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp` +
      `&limit=6` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store', // caching is handled by unstable_cache wrapper
        signal: AbortSignal.timeout(5_000),
      });
    } catch (err) {
      // Scrub token from any error message before re-throwing.
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[instagram] fetch failed: ${msg.replace(accessToken, '[REDACTED]')}`);
    }

    if (!res.ok) {
      // Graph returns HTTP 400 { error: {...} } for dead tokens — treat as throw
      // so the cache entry is not poisoned with an error object.
      throw new Error(`[instagram] Graph API returned HTTP ${res.status}`);
    }

    const json: unknown = await res.json();
    return normalizePosts(json);
  },
  ['instagram-ig-posts-raw'],
  { tags: ['instagram'], revalidate: 600 },
);

// ─── Public export ────────────────────────────────────────────────────────────

/**
 * fetchIgPosts — returns the 6 most recent Instagram posts via Meta Graph API.
 *
 * Returns:
 *   { data: IgPost[]; stale: boolean }
 *   stale=false → data is fresh (mock or live cache hit)
 *   stale=true  → live fetch failed; mock fixture is served instead
 *
 * The caller (home page Instagram slot) should degrade gracefully on stale=true.
 * The access token is never exposed to the client.
 */
export async function fetchIgPosts(): Promise<{ data: IgPost[]; stale: boolean }> {
  const modeResult = await resolveInstagramMode();

  if (modeResult.mode === 'mock') {
    return { data: mockPosts, stale: false };
  }

  const { accessToken } = modeResult;

  try {
    const data = await getCachedIgPostsRaw(accessToken);
    return { data, stale: false };
  } catch (err) {
    // Scrub the token from the logged error message.
    const raw = err instanceof Error ? err.message : String(err);
    const scrubbed = raw.replace(accessToken, '[REDACTED]');
    console.error('[instagram] fetchIgPosts live fetch failed — returning mock fallback:', scrubbed);
    return { data: mockPosts, stale: true };
  }
}
