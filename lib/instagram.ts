/**
 * lib/instagram.ts — Server-only Behold.so Instagram feed fetcher.
 *
 * Exports:
 *   fetchIgPosts()  Promise<{ data: IgPost[]; stale: boolean }>
 *
 * Mock/live precedence (first match → mock):
 *   1. integration row absent, disabled, or mode !== 'live'  → mock
 *   2. mode === 'live' but config.feed_id empty              → mock + warn
 *   3. feed_id present                                       → live fetch
 *   4. live fetch throws / non-2xx / timeout                 → graceful fallback (stale:true)
 *
 * Behold.so public feed URL: https://feeds.behold.so/{feed_id}
 *
 * Behold feed JSON shape (documented + defensive):
 *   [
 *     {
 *       id:           string,
 *       mediaType:    "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM",
 *       mediaUrl:     string,
 *       thumbnailUrl: string | null,   // present for VIDEO and CAROUSEL_ALBUM
 *       permalink:    string,           // direct link to the IG post
 *       caption:      string | null,
 *       sizes: {
 *         medium?: { mediaUrl: string },
 *         small?:  { mediaUrl: string },
 *         // ...
 *       } | null,
 *       timestamp:    string,           // ISO-8601
 *     }
 *   ]
 *
 * The feed may be a top-level array OR wrapped in { posts: [...] }; we handle
 * both defensively. Limit to the 6 most recent (newest-first order preserved).
 *
 * imageUrl strategy:
 *   - VIDEO posts: use thumbnailUrl (first frame), fall back to mediaUrl.
 *   - IMAGE/CAROUSEL posts: prefer sizes.medium.mediaUrl, then sizes.small.mediaUrl,
 *     then mediaUrl.
 *
 * alt: first line of caption (before "\n"), trimmed; generic fallback if absent.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { getIntegration } from '@/lib/db/queries/integrations';
import { igPosts as mockPosts, INSTAGRAM_PROFILE_URL } from '@/app/__fixtures__/instagram';
import type { IgPost } from '@/lib/fixtures/types';

// ─── Credential/config resolution ─────────────────────────────────────────────

type InstagramMode =
  | { mode: 'mock' }
  | { mode: 'live'; feedId: string };

/**
 * resolveInstagramMode — decision logic for fetchIgPosts.
 *
 * Instagram (Behold) has no encrypted credentials — only a public feed_id
 * stored in the `config` jsonb column.
 *
 * Returns mock mode whenever:
 *   - the integration row is absent, disabled, or mode !== 'live'
 *   - config.feed_id is absent or empty
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

  // feed_id lives in the config jsonb column — not encrypted.
  const config =
    row.config && typeof row.config === 'object' && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};

  const feedId = typeof config['feed_id'] === 'string' ? config['feed_id'].trim() : '';

  if (!feedId) {
    console.warn('[instagram] mode=live but config.feed_id is empty — falling back to mock');
    return { mode: 'mock' };
  }

  return { mode: 'live', feedId };
}

// ─── Post normalisation ───────────────────────────────────────────────────────

/**
 * normalizePosts — maps Behold feed JSON to IgPost[].
 *
 * Handles both top-level array and { posts: [...] } envelope defensively.
 * Limits to the 6 most recent (Behold returns newest-first).
 */
function normalizePosts(raw: unknown): IgPost[] {
  if (!raw) return [];

  // Resolve the posts array — either top-level array or { posts: [...] }.
  let items: unknown[];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (
    raw !== null &&
    typeof raw === 'object' &&
    Array.isArray((raw as Record<string, unknown>)['posts'])
  ) {
    items = (raw as Record<string, unknown>)['posts'] as unknown[];
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

    const mediaType = str(p['mediaType']) ?? 'IMAGE';
    const mediaUrl = str(p['mediaUrl']) ?? '';
    const thumbnailUrl = str(p['thumbnailUrl']);

    // sizes sub-object — may be null or absent.
    const sizes =
      p['sizes'] && typeof p['sizes'] === 'object' && !Array.isArray(p['sizes'])
        ? (p['sizes'] as Record<string, unknown>)
        : null;

    function sizedUrl(key: string): string | null {
      if (!sizes) return null;
      const entry = sizes[key];
      if (!entry || typeof entry !== 'object') return null;
      return str((entry as Record<string, unknown>)['mediaUrl']);
    }

    // imageUrl strategy:
    //   VIDEO → thumbnailUrl first (first-frame preview), else mediaUrl
    //   IMAGE / CAROUSEL → sizes.medium, sizes.small, then mediaUrl
    let imageUrl: string;
    if (mediaType === 'VIDEO') {
      imageUrl = thumbnailUrl ?? mediaUrl;
    } else {
      imageUrl = sizedUrl('medium') ?? sizedUrl('small') ?? mediaUrl;
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
 * getCachedIgPostsRaw — Next Data Cache wrapper around the live Behold feed fetch.
 *
 * Throws on failure so failed responses are never cached.
 * Tagged ['instagram'] with 3600-second (1-hour) revalidation.
 */
const getCachedIgPostsRaw = unstable_cache(
  async (feedId: string): Promise<IgPost[]> => {
    const url = `https://feeds.behold.so/${encodeURIComponent(feedId)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`[instagram] Behold feed returned HTTP ${res.status}`);
    }

    const json: unknown = await res.json();
    return normalizePosts(json);
  },
  ['instagram-ig-posts-raw'],
  { tags: ['instagram'], revalidate: 3600 },
);

// ─── Public export ────────────────────────────────────────────────────────────

/**
 * fetchIgPosts — returns the 6 most recent Instagram posts via Behold.so.
 *
 * Returns:
 *   { data: IgPost[]; stale: boolean }
 *   stale=false → data is fresh (mock or live cache hit)
 *   stale=true  → live fetch failed; mock fixture is served instead
 *
 * The caller (home page Instagram slot) should degrade gracefully on stale=true.
 * No credentials are ever exposed to the client — feed_id is a public identifier.
 */
export async function fetchIgPosts(): Promise<{ data: IgPost[]; stale: boolean }> {
  const modeResult = await resolveInstagramMode();

  if (modeResult.mode === 'mock') {
    return { data: mockPosts, stale: false };
  }

  const { feedId } = modeResult;

  try {
    const data = await getCachedIgPostsRaw(feedId);
    return { data, stale: false };
  } catch (err) {
    console.error('[instagram] fetchIgPosts live fetch failed — returning mock fallback:', err);
    return { data: mockPosts, stale: true };
  }
}
