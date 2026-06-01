/**
 * lib/untappd.ts — Server-only Untappd for Business fetcher.
 *
 * Exports:
 *   fetchTaps()    Promise<{ data: Tap[]; stale: boolean }>
 *   fetchEvents()  Promise<UntappdEvent[]>
 *   UntappdEvent   (intermediate type for cron upsert into events_cache)
 *
 * Mock/live precedence (first match → mock):
 *   1. integration row absent, disabled, or mode !== 'live'  → mock
 *   2. mode === 'live' but creds null / {} (decrypt fail)    → mock + warn
 *   3. creds present                                         → live fetch
 *   4. live fetch throws / non-2xx / timeout                 → graceful fallback
 *
 * Auth is HTTP Basic: Authorization: Basic <base64(email:read_write_token)>
 * per verified Untappd for Business API docs. Bearer auth was a Phase-4
 * assumption and is now corrected.
 *
 * Menus endpoint: GET /api/v1/locations/{location_id}/menus (verified path).
 * Events endpoint: GET /api/v1/locations/{location_id}/events (best-guess
 * location-scoped path — isolate in fetchEvents() pending real-creds
 * confirmation). All JSON→type mapping is isolated in normalizeTaps() and
 * normalizeEvents() so a shape correction is a one-function fix per export.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { getIntegration, decryptCredentials } from '@/lib/db/queries/integrations';
import { taps as mockTaps } from '@/lib/fixtures/taps';
import { events as mockEvents } from '@/lib/fixtures/events';
import type { Tap } from '@/lib/fixtures/types';

// ─── Exported intermediate type for cron upsert ───────────────────────────────

/**
 * Normalised Untappd event shape suited for upsert into the events_cache table.
 * The cron route owns the DB write; this module only fetches + normalises.
 */
export type UntappdEvent = {
  untappdEventId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  coverImageUrl: string | null;
  externalUrl: string | null;
};

// ─── Credential resolution ────────────────────────────────────────────────────

type UntappdMode =
  | { mode: 'mock' }
  | { mode: 'live'; creds: { email: string; location_id: string; read_write_token: string } };

/**
 * resolveUntappdMode — shared decision logic for fetchTaps and fetchEvents.
 *
 * Returns mock mode whenever:
 *   - the integration row is absent, disabled, or set to 'mock'
 *   - decryptCredentials returns null or an empty object
 *   - the decrypted payload is missing required keys
 *
 * Never logs or surfaces credential values.
 */
async function resolveUntappdMode(): Promise<UntappdMode> {
  let row: Awaited<ReturnType<typeof getIntegration>>;
  try {
    row = await getIntegration('untappd');
  } catch {
    // DB unavailable — treat as mock so the page still renders.
    return { mode: 'mock' };
  }

  if (!row || !row.enabled || row.mode !== 'live') {
    return { mode: 'mock' };
  }

  let rawCreds: Record<string, unknown> | null;
  try {
    rawCreds = await decryptCredentials('untappd');
  } catch {
    console.warn('[untappd] decryptCredentials threw — falling back to mock');
    return { mode: 'mock' };
  }

  // null = key missing or decrypt failure; {} = creds never set
  if (!rawCreds || Object.keys(rawCreds).length === 0) {
    console.warn('[untappd] mode=live but credentials missing or empty — falling back to mock');
    return { mode: 'mock' };
  }

  const email = typeof rawCreds['email'] === 'string' ? rawCreds['email'] : '';
  const location_id = typeof rawCreds['location_id'] === 'string' ? rawCreds['location_id'] : '';
  const read_write_token =
    typeof rawCreds['read_write_token'] === 'string' ? rawCreds['read_write_token'] : '';

  if (!email || !location_id || !read_write_token) {
    console.warn('[untappd] mode=live but required credential keys absent — falling back to mock');
    return { mode: 'mock' };
  }

  return { mode: 'live', creds: { email, location_id, read_write_token } };
}

// ─── Tap normalisation ────────────────────────────────────────────────────────

/**
 * normalizeTaps — maps the Untappd for Business menu JSON to Tap[].
 *
 * ASSUMPTION: The API returns a JSON envelope like:
 *   {
 *     menus: [{
 *       menu_sections: [{
 *         items: [{
 *           id: number | string,
 *           name: string,
 *           brewery: { brewery_name: string },
 *           style: string,
 *           abv: number,
 *           ibu: number | null,
 *           description: string,
 *           label_image: string | null,
 *           tap_number: number | null,
 *           is_featured: boolean | null,
 *         }]
 *       }]
 *     }]
 *   }
 *
 * Defensive access throughout: every field defaults gracefully when absent.
 * If the real shape differs, this function is the single point to correct.
 */
function normalizeTaps(raw: unknown): Tap[] {
  if (!raw || typeof raw !== 'object') return [];

  const envelope = raw as Record<string, unknown>;

  // Flatten all items across all menus and all sections.
  const menus = Array.isArray(envelope['menus']) ? envelope['menus'] : [];

  const items: unknown[] = [];
  for (const menu of menus) {
    if (!menu || typeof menu !== 'object') continue;
    const sections = Array.isArray((menu as Record<string, unknown>)['menu_sections'])
      ? ((menu as Record<string, unknown>)['menu_sections'] as unknown[])
      : [];
    for (const section of sections) {
      if (!section || typeof section !== 'object') continue;
      const sectionItems = Array.isArray((section as Record<string, unknown>)['items'])
        ? ((section as Record<string, unknown>)['items'] as unknown[])
        : [];
      items.push(...sectionItems);
    }
  }

  return items.map((item, index): Tap => {
    if (!item || typeof item !== 'object') {
      return {
        id: `tap-unknown-${index}`,
        name: 'Unknown',
        brewery: 'Unknown Brewery',
        style: 'Unknown Style',
        abv: 0,
        ibu: null,
        description: '',
        imageUrl: null,
        tapNumber: index + 1,
        isFeatured: false,
      };
    }

    const t = item as Record<string, unknown>;
    const breweryObj = t['brewery'];
    const brewery =
      breweryObj && typeof breweryObj === 'object'
        ? String((breweryObj as Record<string, unknown>)['brewery_name'] ?? 'Unknown Brewery')
        : 'Unknown Brewery';

    // tap_number may be null for unlabelled taps — fall back to position.
    const tapNumber =
      typeof t['tap_number'] === 'number' && t['tap_number'] > 0
        ? t['tap_number']
        : index + 1;

    return {
      id: String(t['id'] ?? `tap-${index}`),
      name: String(t['name'] ?? 'Untitled'),
      brewery,
      style: String(t['style'] ?? ''),
      abv: typeof t['abv'] === 'number' ? t['abv'] : 0,
      ibu: typeof t['ibu'] === 'number' ? t['ibu'] : null,
      description: String(t['description'] ?? ''),
      imageUrl: typeof t['label_image'] === 'string' ? t['label_image'] : null,
      tapNumber,
      isFeatured: t['is_featured'] === true,
    };
  });
}

// ─── Event normalisation ──────────────────────────────────────────────────────

/**
 * normalizeEvents — maps the Untappd for Business events JSON to UntappdEvent[].
 *
 * ASSUMPTION (same Phase-4 caveat as normalizeTaps): The events endpoint is
 * assumed to be GET /api/v1/events?location_id={id} and to return an envelope
 * shaped like:
 *   {
 *     events: [{
 *       id: number | string,
 *       name: string,
 *       description: string,
 *       start_time: string,   // ISO-8601
 *       end_time: string | null,
 *       cover_url: string | null,
 *       event_url: string | null,
 *     }]
 *   }
 *
 * Isolate any schema corrections here.
 */
function normalizeEvents(raw: unknown): UntappdEvent[] {
  if (!raw || typeof raw !== 'object') return [];

  const envelope = raw as Record<string, unknown>;
  const items = Array.isArray(envelope['events']) ? envelope['events'] : [];

  return items.map((item, index): UntappdEvent => {
    if (!item || typeof item !== 'object') {
      return {
        untappdEventId: `event-unknown-${index}`,
        title: 'Unknown Event',
        description: '',
        startsAt: new Date().toISOString(),
        endsAt: null,
        coverImageUrl: null,
        externalUrl: null,
      };
    }

    const e = item as Record<string, unknown>;

    return {
      untappdEventId: String(e['id'] ?? `event-${index}`),
      title: String(e['name'] ?? 'Untitled Event'),
      description: String(e['description'] ?? ''),
      startsAt: typeof e['start_time'] === 'string' ? e['start_time'] : new Date().toISOString(),
      endsAt: typeof e['end_time'] === 'string' ? e['end_time'] : null,
      coverImageUrl: typeof e['cover_url'] === 'string' ? e['cover_url'] : null,
      externalUrl: typeof e['event_url'] === 'string' ? e['event_url'] : null,
    };
  });
}

// ─── Cached live fetch (taps) ─────────────────────────────────────────────────

/**
 * getCachedTapsRaw — private Next Data Cache wrapper around the live tap fetch.
 *
 * Only SUCCESSFUL responses are cached (throws on failure so the failed fetch
 * is never stored). The public fetchTaps() wrapper catches the throw and falls
 * back to the last-good cache or mock fixture.
 *
 * Tagged ['taps'] so revalidateTag('taps', 'max') from the admin "refresh now"
 * button busts this entry.
 */
const getCachedTapsRaw = unstable_cache(
  async (email: string, location_id: string, read_write_token: string): Promise<Tap[]> => {
    const basicToken = Buffer.from(`${email}:${read_write_token}`).toString('base64');
    const url = `https://business.untappd.com/api/v1/locations/${encodeURIComponent(location_id)}/menus`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`[untappd] menus endpoint returned ${res.status}`);
    }

    const json: unknown = await res.json();
    return normalizeTaps(json);
  },
  ['untappd-taps-raw'],
  { tags: ['taps'], revalidate: 300 },
);

// ─── Public exports ───────────────────────────────────────────────────────────

/**
 * fetchTaps — public entry point for the tap-list page and any RSC that renders
 * the current tap list.
 *
 * Returns:
 *   { data: Tap[]; stale: boolean }
 *   stale=false → data is fresh (mock or live cache hit)
 *   stale=true  → live fetch failed; data is the last-known-good cache or mock
 *                 fixture fallback (cold-start edge: first-ever fetch failed)
 *
 * The caller should surface "live menu temporarily unavailable" when stale=true.
 */
export async function fetchTaps(): Promise<{ data: Tap[]; stale: boolean }> {
  const modeResult = await resolveUntappdMode();

  if (modeResult.mode === 'mock') {
    return { data: mockTaps, stale: false };
  }

  const { email, location_id, read_write_token } = modeResult.creds;

  try {
    const data = await getCachedTapsRaw(email, location_id, read_write_token);
    return { data, stale: false };
  } catch (err) {
    console.error('[untappd] fetchTaps live fetch failed — returning stale/mock fallback:', err);
    // Cold-start (nothing in cache) or cache invalidated during an outage:
    // fall back to mock fixture so the page is never blank.
    return { data: mockTaps, stale: true };
  }
}

/**
 * fetchEvents — live Untappd events fetch used by the cron (next wave).
 *
 * Returns normalised UntappdEvent[] ready for upsert into events_cache.
 *
 * In MOCK mode: derives events from the fixture file so the cron can be
 * exercised with mock creds and /events still renders fixture data end-to-end.
 *
 * In LIVE mode: fetches from the events endpoint and THROWS on failure.
 * The cron is responsible for catching and skipping the destructive write —
 * a silent empty array would soft-delete every event, so we do NOT fall back.
 */
export async function fetchEvents(): Promise<UntappdEvent[]> {
  const modeResult = await resolveUntappdMode();

  if (modeResult.mode === 'mock') {
    // Derive from fixture — map Event fixture shape to UntappdEvent.
    return mockEvents.map((e) => ({
      untappdEventId: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt,
      endsAt: e.endsAt ?? null,
      coverImageUrl: e.imageUrl ?? null,
      externalUrl: e.ticketUrl ?? null,
    }));
  }

  const { email, location_id, read_write_token } = modeResult.creds;

  const basicToken = Buffer.from(`${email}:${read_write_token}`).toString('base64');

  // NOTE (INFERRED — isolate for easy correction): The events sub-path
  // /api/v1/locations/{id}/events is a best-guess location-scoped URL matching
  // the verified menus pattern. Confirm with real creds and adjust here if the
  // actual path differs; normalizeEvents() handles the response shape separately.
  const url = `https://business.untappd.com/api/v1/locations/${encodeURIComponent(location_id)}/events`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${basicToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) {
    throw new Error(`[untappd] events endpoint returned ${res.status}`);
  }

  const json: unknown = await res.json();
  return normalizeEvents(json);
}
