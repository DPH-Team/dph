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
 * per verified Untappd for Business API docs.
 *
 * Tap list traversal (real hierarchical API — three separate endpoints):
 *   1. GET /api/v1/locations/{location_id}/menus
 *        → collect menu ids
 *   2. GET /api/v1/menus/{menu_id}/sections  (per menu, in parallel)
 *        → keep only sections where public===true AND type!=='OnDeckSection'
 *   3. GET /api/v1/sections/{section_id}/items  (per section, in parallel)
 *        → flatten all items, normalize each via normalizeTaps(item, index)
 *
 * Events endpoint: GET /api/v1/locations/{location_id}/events (VERIFIED —
 * confirmed against a real API sample; response shape and Basic auth are both
 * correct). All JSON→type mapping is isolated in normalizeTaps() and
 * normalizeEvents() so a shape correction is a one-function fix per export.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { getIntegration, decryptCredentials } from '@/lib/db/queries/integrations';
import { taps as mockTaps } from '@/lib/fixtures/taps';
import { events as mockEvents } from '@/lib/fixtures/events';
import { checkins as mockCheckins } from '@/lib/fixtures/checkins';
import type { Tap, Checkin } from '@/lib/fixtures/types';

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
 * normalizeTaps — maps a single raw item from /api/v1/sections/{id}/items to Tap.
 *
 * VERIFIED item shape (from real Untappd for Business API sample):
 *   {
 *     id:                 number,
 *     tap_number:         string | null,   // STRING, not number; null for non-draft items
 *     name:               string,
 *     custom_name:        string | null,
 *     brewery:            string | null,   // beer; null for wine/spirit (use producer)
 *     custom_brewery:     string | null,
 *     producer:           string | null,   // wine/spirit
 *     style:              string | null,
 *     custom_style:       string | null,
 *     category:           string | null,
 *     characteristics:    string | null,
 *     abv:                string | null,   // STRING e.g. "4.2"
 *     custom_abv:         string | null,
 *     original_abv:       string | null,
 *     ibu:                string | null,   // STRING e.g. "45.0", may be null
 *     custom_ibu:         string | null,
 *     description:        string | null,
 *     custom_description: string | null,
 *     label_image:        string | null,
 *     label_image_hd:     string | null,
 *     custom_label_image: string | null,
 *     default_image:      string | null,
 *     type:               "beer" | "wine" | "spirit",
 *   }
 *
 * Defensive access throughout — every field defaults gracefully when absent.
 * abv is always returned as a number (never null) because TapCard calls .toFixed(1).
 */
function normalizeTaps(item: unknown, index: number): Tap {
  if (!item || typeof item !== 'object') {
    return {
      id: `tap-unknown-${index}`,
      name: 'Unknown',
      brewery: '',
      style: '',
      abv: 0,
      ibu: null,
      description: '',
      imageUrl: null,
      tapNumber: index + 1,
      isFeatured: false,
    };
  }

  const t = item as Record<string, unknown>;

  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.length > 0 ? v : null;

  // name: prefer custom_name, then name
  const name = str(t['custom_name']) ?? str(t['name']) ?? 'Untitled';

  // brewery: prefer custom_brewery, then brewery (beer), then producer (wine/spirit)
  const brewery = str(t['custom_brewery']) ?? str(t['brewery']) ?? str(t['producer']) ?? '';

  // style: prefer custom_style, then style, then category, then characteristics
  const style =
    str(t['custom_style']) ??
    str(t['style']) ??
    str(t['category']) ??
    str(t['characteristics']) ??
    '';

  // abv: prefer custom_abv, then abv, then original_abv — all come as STRING from API
  const abvRaw = str(t['custom_abv']) ?? str(t['abv']) ?? str(t['original_abv']);
  const abv = abvRaw !== null ? parseFloat(abvRaw) : NaN;

  // ibu: prefer custom_ibu, then ibu — STRING or null
  const ibuRaw = str(t['custom_ibu']) ?? str(t['ibu']);
  const ibuParsed = ibuRaw !== null ? parseFloat(ibuRaw) : NaN;
  const ibu = !isNaN(ibuParsed) ? ibuParsed : null;

  // description: prefer custom_description, then description
  const description = str(t['custom_description']) ?? str(t['description']) ?? '';

  // imageUrl: first non-empty of custom_label_image, label_image_hd, label_image, default_image
  const imageUrl =
    str(t['custom_label_image']) ??
    str(t['label_image_hd']) ??
    str(t['label_image']) ??
    str(t['default_image']) ??
    null;

  // tap_number is a STRING in the real API (e.g. "1"), not a number; may be null.
  // Many non-draft items have null tap_number — fall back to traversal index+1.
  const tapRaw = str(t['tap_number']);
  const tapParsed = tapRaw !== null ? parseInt(tapRaw, 10) : NaN;
  const tapNumber = !isNaN(tapParsed) && tapParsed > 0 ? tapParsed : index + 1;

  return {
    id: String(t['id'] ?? `tap-${index}`),
    name,
    brewery,
    style,
    // TapCard calls abv.toFixed(1) — must be a number, never null; default 0 when unset.
    abv: !isNaN(abv) ? abv : 0,
    ibu,
    description,
    imageUrl,
    tapNumber,
    // The Untappd for Business items API has no per-item featured flag.
    isFeatured: false,
  };
}

// ─── Event normalisation ──────────────────────────────────────────────────────

/**
 * normalizeEvents — maps the Untappd for Business events JSON to UntappdEvent[].
 *
 * VERIFIED against a real API sample. Endpoint:
 *   GET /api/v1/locations/{location_id}/events  (HTTP Basic auth)
 *
 * Real response envelope:
 *   {
 *     events: [{
 *       id:           number,          // required — skip row if absent
 *       name:         string,          // -> title (skip row if absent)
 *       description:  string,          // -> description (may be empty string)
 *       start_time:   string,          // UTC ISO-8601 "…Z" -> startsAt (required)
 *       end_time:     string | null,   // UTC ISO-8601 "…Z" -> endsAt (may be null/absent)
 *       start_time_in_zone: string,    // local-timezone variant — ignored
 *       end_time_in_zone:   string,    // local-timezone variant — ignored
 *       location_id:  number,
 *       link:         string | null,   // venue/website link -> externalUrl
 *       place_json:   object,          // generic Google Maps business icon — NOT a cover image
 *       from_facebook: boolean,
 *       // …location address fields, created_at, updated_at (all ignored)
 *     }]
 *   }
 *
 * Real-API caveats (verified):
 *   - Cover image: image_url is the verified per-event cover image field.
 *     Host is utfb-images.untappd.com; the value includes resize query params.
 *     Maps to coverImageUrl; null when absent or empty string.
 *     (place_json.icon is a generic Google Maps business icon — not used.)
 *   - No public Untappd event URL: UTFB events have no public Untappd event
 *     page. `link` is a venue/website link and is the closest available
 *     external URL; it maps to externalUrl. Often an empty string → null.
 *
 * Sync note: ALL events (past and future) are returned and stored. Past events
 * (e.g. from 2017) are valid and belong in the past tab — do not date-filter here.
 */
function normalizeEvents(raw: unknown): UntappdEvent[] {
  if (!raw || typeof raw !== 'object') return [];

  const envelope = raw as Record<string, unknown>;

  // Defensive: if 'events' key is absent or not an array, return empty list.
  // This is a legitimate empty-list result, not a fetch error — fetchEvents()
  // only throws on transport/non-2xx failures so the two cases stay distinct.
  if (!Array.isArray(envelope['events'])) return [];

  const items = envelope['events'];
  const results: UntappdEvent[] = [];

  for (const item of items) {
    // Skip non-object entries defensively.
    if (!item || typeof item !== 'object') continue;

    const e = item as Record<string, unknown>;

    // id and start_time are both required (starts_at is NOT NULL in the cache).
    // Skip the event if either is absent.
    if (e['id'] == null || typeof e['start_time'] !== 'string' || !e['start_time']) continue;

    // title (name) is required — skip if absent or empty.
    if (typeof e['name'] !== 'string' || !e['name']) continue;

    results.push({
      untappdEventId: String(e['id']),
      title: e['name'],
      description: typeof e['description'] === 'string' ? e['description'] : '',
      // Use start_time (UTC "…Z" value), NOT start_time_in_zone.
      startsAt: e['start_time'],
      // Use end_time (UTC "…Z" value), NOT end_time_in_zone. Null/absent → null.
      endsAt: typeof e['end_time'] === 'string' && e['end_time'] ? e['end_time'] : null,
      // image_url is the verified per-event cover image field (host:
      // utfb-images.untappd.com; comes with resize query params). Use it when
      // present as a non-empty string; otherwise null.
      coverImageUrl: typeof e['image_url'] === 'string' && e['image_url'] ? e['image_url'] : null,
      // UTFB has no public Untappd event page. `link` is the venue/website URL
      // and is the closest available external link.
      externalUrl: typeof e['link'] === 'string' && e['link'] ? e['link'] : null,
    });
  }

  return results;
}

// ─── Cached live fetch (taps) ─────────────────────────────────────────────────

/**
 * getCachedTapsRaw — private Next Data Cache wrapper around the live tap fetch.
 *
 * Traverses the real Untappd for Business hierarchical API across three
 * endpoint levels:
 *   locations/{id}/menus  →  menus/{id}/sections  →  sections/{id}/items
 *
 * Per-menu and per-section calls are parallelised with Promise.all so a
 * cache-miss does not serialize dozens of round-trips.
 *
 * Any fetch failure (network, timeout, non-2xx) throws, which prevents caching
 * the failure. fetchTaps() catches and falls back to the last-good cache or the
 * mock fixture.
 *
 * Tagged ['taps'] so revalidateTag('taps') from the admin "refresh now" button
 * busts this entry.
 */
const getCachedTapsRaw = unstable_cache(
  async (email: string, location_id: string, read_write_token: string): Promise<Tap[]> => {
    const basicToken = Buffer.from(`${email}:${read_write_token}`).toString('base64');
    const BASE = 'https://business.untappd.com/api/v1';

    /**
     * untappdGet — fetches a single Untappd for Business API path and returns
     * the parsed JSON. Throws on any network error, AbortSignal timeout, or
     * non-2xx HTTP status so the outer Promise.all propagates the failure.
     * Never logs credential values.
     */
    async function untappdGet(path: string): Promise<unknown> {
      const res = await fetch(`${BASE}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${basicToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) {
        throw new Error(`[untappd] ${path} returned HTTP ${res.status}`);
      }
      return res.json() as Promise<unknown>;
    }

    // ── Step 1: list menus for this location ──────────────────────────────────
    //
    // ASSUMED (not 100%-confirmed from a real sample) envelope shape:
    //   { "menus": [ { "id": <number>, "name": <string>, ... } ] }
    // This follows the consistent {plural:[...]} pattern of the UTFB API.
    // Code reads menus[].id defensively: skips entries without a numeric id
    // so a shape deviation degrades to fewer menus rather than a crash.
    const menusJson = await untappdGet(`/locations/${encodeURIComponent(location_id)}/menus`);
    const menusEnvelope =
      menusJson && typeof menusJson === 'object' ? (menusJson as Record<string, unknown>) : {};
    const rawMenus = Array.isArray(menusEnvelope['menus']) ? menusEnvelope['menus'] : [];

    const menuIds: number[] = [];
    for (const m of rawMenus) {
      if (!m || typeof m !== 'object') continue;
      const id = (m as Record<string, unknown>)['id'];
      // Coerce to number defensively; skip entries without a usable id.
      const numId = typeof id === 'number' ? id : typeof id === 'string' ? parseInt(id, 10) : NaN;
      if (!isNaN(numId) && numId > 0) menuIds.push(numId);
    }

    // ── Step 2: list sections for each menu (parallel) ────────────────────────
    //
    // VERIFIED response: { "sections": [{ "id", "type", "public", ... }] }
    // Keep only sections where public===true AND type!=='OnDeckSection'.
    // On-deck items are not currently pouring and must be excluded.
    const allSectionArrays = await Promise.all(
      menuIds.map((menuId) => untappdGet(`/menus/${menuId}/sections`)),
    );

    const sectionIds: number[] = [];
    for (const sectionsJson of allSectionArrays) {
      if (!sectionsJson || typeof sectionsJson !== 'object') continue;
      const envelope = sectionsJson as Record<string, unknown>;
      const rawSections = Array.isArray(envelope['sections']) ? envelope['sections'] : [];
      for (const s of rawSections) {
        if (!s || typeof s !== 'object') continue;
        const sec = s as Record<string, unknown>;
        if (sec['public'] !== true) continue;
        if (sec['type'] === 'OnDeckSection') continue;
        const id = sec['id'];
        const numId =
          typeof id === 'number' ? id : typeof id === 'string' ? parseInt(id, 10) : NaN;
        if (!isNaN(numId) && numId > 0) sectionIds.push(numId);
      }
    }

    // ── Step 3: list items for each section (parallel) ────────────────────────
    //
    // VERIFIED response: { "items": [ { tap_number, name, brewery, abv, ... } ] }
    // Flatten all item arrays; preserve traversal order (menu order → section
    // position order → item position order) for a stable tap-number fallback.
    const allItemArrays = await Promise.all(
      sectionIds.map((sectionId) => untappdGet(`/sections/${sectionId}/items`)),
    );

    const flatItems: unknown[] = [];
    for (const itemsJson of allItemArrays) {
      if (!itemsJson || typeof itemsJson !== 'object') continue;
      const envelope = itemsJson as Record<string, unknown>;
      const rawItems = Array.isArray(envelope['items']) ? envelope['items'] : [];
      flatItems.push(...rawItems);
    }

    // ── Step 4: normalize each item to Tap ───────────────────────────────────
    return flatItems.map((item, index) => normalizeTaps(item, index));
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

// ─── Check-in normalisation ───────────────────────────────────────────────────

/**
 * normalizeCheckins — maps the Untappd for Business check-ins JSON to Checkin[].
 *
 * Endpoint: GET /api/v1/locations/{location_id}/checkins  (HTTP Basic auth)
 *
 * Documented response envelope:
 *   {
 *     checkins: [{
 *       id:         number,
 *       created_at: string,   // ISO-8601
 *       beer: {
 *         name:             string,
 *         brewery:          string,
 *         rating:           number | null,
 *         label_image_thumb: string | null,
 *       },
 *       user: {
 *         first_name: string,
 *         avatar:     string | null,
 *       },
 *     }],
 *     max_id: number,
 *   }
 *
 * Defensive throughout — every field defaults gracefully when absent.
 * Limits to the 15 most recent (API returns newest-first; we take the head).
 */
function normalizeCheckins(raw: unknown): Checkin[] {
  if (!raw || typeof raw !== 'object') return [];

  const envelope = raw as Record<string, unknown>;
  if (!Array.isArray(envelope['checkins'])) return [];

  const items = (envelope['checkins'] as unknown[]).slice(0, 15);
  const results: Checkin[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    const c = item as Record<string, unknown>;

    // id is required — skip if absent.
    if (c['id'] == null) continue;

    // beer and user sub-objects — default to empty object if absent.
    const beer =
      c['beer'] && typeof c['beer'] === 'object'
        ? (c['beer'] as Record<string, unknown>)
        : {};
    const user =
      c['user'] && typeof c['user'] === 'object'
        ? (c['user'] as Record<string, unknown>)
        : {};

    const str = (v: unknown): string | null =>
      typeof v === 'string' && v.length > 0 ? v : null;

    // rating: number 0..5 or null (absent / not rated).
    const ratingRaw = beer['rating'];
    const rating =
      typeof ratingRaw === 'number' && !isNaN(ratingRaw) ? ratingRaw : null;

    results.push({
      id: String(c['id']),
      userFirstName: str(user['first_name']) ?? 'Someone',
      userAvatarUrl: str(user['avatar']),
      beerName: str(beer['name']) ?? 'Untitled Beer',
      brewery: str(beer['brewery']) ?? '',
      beerLabelUrl: str(beer['label_image_thumb']),
      rating,
      createdAt: str(c['created_at']) ?? new Date().toISOString(),
    });
  }

  return results;
}

// ─── Cached live fetch (checkins) ─────────────────────────────────────────────

/**
 * getCachedCheckinsRaw — Next Data Cache wrapper around the live check-ins fetch.
 *
 * Throws on failure (non-2xx or network error) so the failed response is never
 * stored. fetchCheckins() catches and falls back to mock.
 *
 * Tagged ['checkins'] so revalidateTag('checkins') busts this entry.
 */
const getCachedCheckinsRaw = unstable_cache(
  async (email: string, location_id: string, read_write_token: string): Promise<Checkin[]> => {
    const basicToken = Buffer.from(`${email}:${read_write_token}`).toString('base64');
    const url = `https://business.untappd.com/api/v1/locations/${encodeURIComponent(location_id)}/checkins`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`[untappd] checkins endpoint returned HTTP ${res.status}`);
    }

    const json: unknown = await res.json();
    return normalizeCheckins(json);
  },
  ['untappd-checkins-raw'],
  { tags: ['checkins'], revalidate: 300 },
);

// ─── Public export: fetchCheckins ─────────────────────────────────────────────

/**
 * fetchCheckins — returns the 15 most recent check-ins for the location.
 *
 * Returns:
 *   { data: Checkin[]; stale: boolean }
 *   stale=false → data is fresh (mock or live cache hit)
 *   stale=true  → live fetch failed; data is last-known-good cache or mock fixture
 *
 * The homepage ticker polls /api/checkins every 5 min which calls this.
 * Mock/live precedence is identical to fetchTaps.
 */
export async function fetchCheckins(): Promise<{ data: Checkin[]; stale: boolean }> {
  const modeResult = await resolveUntappdMode();

  if (modeResult.mode === 'mock') {
    return { data: mockCheckins, stale: false };
  }

  const { email, location_id, read_write_token } = modeResult.creds;

  try {
    const data = await getCachedCheckinsRaw(email, location_id, read_write_token);
    return { data, stale: false };
  } catch (err) {
    console.error('[untappd] fetchCheckins live fetch failed — returning stale/mock fallback:', err);
    return { data: mockCheckins, stale: true };
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

  // VERIFIED: /api/v1/locations/{id}/events with HTTP Basic auth is the confirmed
  // path and auth mechanism, validated against a real API sample. Auth header
  // construction below matches the verified menus endpoint pattern.
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
