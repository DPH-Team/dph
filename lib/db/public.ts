/**
 * lib/db/public.ts — Public, cached read layer for District Pour Haus.
 *
 * Every function here is a drop-in replacement for the matching fixture so the
 * frontend swap is mechanical (change the import path, done).
 *
 * Caching strategy
 * ─────────────────
 * We use `unstable_cache` from `next/cache` so tag-based revalidation fires when
 * an admin mutation calls `revalidateTag(tag, 'max')`.
 *
 * `revalidateTag` signature (Next.js 16):
 *   revalidateTag(tag: string, profile: string | CacheLifeConfig)
 *
 * We always pass `'max'` as the profile — this sets the post-revalidation cache
 * lifetime to the `max` preset (revalidate: 30 days, expire: never), effectively
 * meaning the cached value lives forever until explicitly invalidated. This is the
 * correct pattern for content that is only ever updated via admin mutations.
 *
 * All admin actions that mutate data covered here MUST call:
 *   revalidateTag('<tag>', 'max')
 * rather than the single-arg form, which is no longer accepted in Next 16.
 *
 * DB-outage resilience
 * ─────────────────────
 * The try/catch is placed OUTSIDE each `unstable_cache` call. This ensures that
 * only successful DB reads are ever stored in the cache — fallback values are
 * returned directly without being cached, so the moment the DB recovers the next
 * call reads fresh data instead of a stale fallback.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { eventsCache } from '@/lib/db/schema';
import { listAllItemsWithSection } from '@/lib/db/queries/menu';
import { listWeeklyHours } from '@/lib/db/queries/weekly-hours';
import { listHoursOverrides } from '@/lib/db/queries/hours-overrides';
import { getEffectiveHoursForDate } from '@/lib/db/queries/hours';
import { todayInVenueDate } from '@/lib/datetime';
import { listTeamMembers } from '@/lib/db/queries/team-members';
import { listGalleryImages } from '@/lib/db/queries/gallery';
import { listPostings } from '@/lib/db/queries/career-postings';
import { getContentBlock } from '@/lib/db/queries/content-blocks';
import {
  listUpcomingEventRows,
  listPastEventRows,
  getEventRowBySlug,
  getEventsSyncStatus,
  listEventSlugs,
} from '@/lib/db/queries/events-cache';
import { listMerchProductRows } from '@/lib/db/queries/merch-products';
import { getPublicUrl } from '@/lib/supabase/storage';
import { hero } from '@/lib/fixtures/hero';
import { homeCallouts } from '@/lib/fixtures/home-callouts';
import { aboutContent } from '@/lib/fixtures/about';
import {
  getUpcomingEvents,
  getPastEvents,
  getEventBySlug,
} from '@/lib/fixtures/events';
import { merchProducts as mockProducts } from '@/lib/fixtures/merch';
import type { MenuSection, MenuItem, WeeklyHours, HoursOverride, TeamMember, GalleryImage, Posting, Event, MerchProduct } from '@/lib/fixtures/types';
import type { ContentBlockKey } from '@/lib/validators/content-blocks';
import type { EffectiveHours } from '@/lib/db/queries/hours';
import type { EventsSyncStatus } from '@/lib/db/queries/events-cache';
import type {
  HomeHeroValue,
  HomeCalloutsValue,
  AboutBodyValue,
} from '@/lib/validators/content-blocks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert an imagePath stored in the DB to a full public URL.
 * Returns null when imagePath is null/undefined.
 */
function resolveImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  return getPublicUrl({ bucket: 'media', path: imagePath });
}

/**
 * Attempt an async read; on any thrown error log it server-side and return the
 * provided fallback value WITHOUT caching it. This ensures the ISR cache is
 * never poisoned with fallback data — only successful DB reads are cached.
 */
async function withFallback<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[public-read] ${name} failed, serving fallback:`, err);
    return fallback;
  }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

/**
 * Return available menu sections with their items.
 *
 * Groups the flat rows returned by listAllItemsWithSection into the MenuSection[]
 * shape that the public /menu page and the fixture getMenuSections() both use.
 * Items with an imagePath get an imageUrl field populated from Supabase Storage.
 */
const _getPublicMenuCached = unstable_cache(
  async (): Promise<MenuSection[]> => {
    const flatRows = await listAllItemsWithSection({ includeUnavailable: false });

    // Group items by section — preserve section sort order by insertion order.
    const sectionMap = new Map<
      string,
      { section: typeof flatRows[0]['section']; items: MenuItem[] }
    >();

    for (const row of flatRows) {
      const sectionId = row.section.id;
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, { section: row.section, items: [] });
      }
      sectionMap.get(sectionId)!.items.push({
        id: row.id,
        sectionId: row.sectionId,
        name: row.name,
        description: row.description,
        priceCents: row.priceCents,
        allergens: row.allergens as MenuItem['allergens'],
        imageUrl: resolveImageUrl(row.imagePath),
        available: row.available,
        showPrice: row.showPrice,
        sortOrder: row.sortOrder,
      });
    }

    return Array.from(sectionMap.values()).map(({ section, items }) => ({
      id: section.id,
      name: section.name,
      description: section.description ?? null,
      sortOrder: section.sortOrder,
      showPrices: section.showPrices,
      items,
    }));
  },
  ['public-menu'],
  { tags: ['menu'] },
);

export async function getPublicMenu(): Promise<MenuSection[]> {
  return withFallback('getPublicMenu', _getPublicMenuCached, []);
}

// ─── Hours — weekly schedule ──────────────────────────────────────────────────

/** All-closed WeeklyHours fallback used when the DB is unreachable. */
const CLOSED_WEEKLY_HOURS: WeeklyHours = (() => {
  const defaults = { open: '', close: '', closed: true };
  const days = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ] as const;
  return Object.fromEntries(days.map((d) => [d, defaults])) as WeeklyHours;
})();

/**
 * Return all 7 weekly-hours rows, shaped as the WeeklyHours fixture map.
 *
 * Missing rows (before seed) fall back to closed: true with null times.
 */
const _getPublicWeeklyHoursCached = unstable_cache(
  async (): Promise<WeeklyHours> => {
    const rows = await listWeeklyHours();

    const defaults = {
      open: '',
      close: '',
      closed: true,
    };

    const map: Partial<WeeklyHours> = {};
    for (const row of rows) {
      map[row.dayOfWeek as keyof WeeklyHours] = {
        open: row.openTime ?? '',
        close: row.closeTime ?? '',
        closed: row.closed,
      };
    }

    const days: (keyof WeeklyHours)[] = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    ];

    return Object.fromEntries(
      days.map((day) => [day, map[day] ?? defaults]),
    ) as WeeklyHours;
  },
  ['public-weekly-hours'],
  { tags: ['hours'] },
);

export async function getPublicWeeklyHours(): Promise<WeeklyHours> {
  return withFallback('getPublicWeeklyHours', _getPublicWeeklyHoursCached, CLOSED_WEEKLY_HOURS);
}

// ─── Hours — overrides (next 90 days) ────────────────────────────────────────

/**
 * Return hours overrides for the next 90 days from today.
 * Shaped as the HoursOverride[] fixture type.
 */
const _getPublicHoursOverridesCached = unstable_cache(
  async (): Promise<HoursOverride[]> => {
    const today = todayInVenueDate();

    // Compute 90 days out without an external date library.
    const todayMs = new Date(today + 'T12:00:00').getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const to = new Date(todayMs + ninetyDaysMs)
      .toISOString()
      .split('T')[0]!;

    const rows = await listHoursOverrides({ from: today, to });

    return rows.map((row) => ({
      date: row.date,
      open: row.openTime ?? null,
      close: row.closeTime ?? null,
      closed: row.closed,
      note: row.note ?? null,
    }));
  },
  ['public-hours-overrides'],
  { tags: ['hours'] },
);

export async function getPublicHoursOverrides(): Promise<HoursOverride[]> {
  return withFallback('getPublicHoursOverrides', _getPublicHoursOverridesCached, []);
}

// ─── Hours — today's effective hours ─────────────────────────────────────────

/** Closed/unknown fallback for when the DB is unreachable. Matches EffectiveHours. */
const CLOSED_EFFECTIVE_HOURS: EffectiveHours = {
  closed: true,
  openTime: null,
  closeTime: null,
  source: 'none',
  note: null,
};

/**
 * Return effective hours for today in venue-local time.
 *
 * This cache entry is intentionally short-lived (revalidate: 60 s) since
 * "today" advances at midnight venue-local time. The tag allows immediate
 * revalidation after an admin hours change.
 */
const _getPublicEffectiveHoursTodayCached = unstable_cache(
  async (): Promise<EffectiveHours> => {
    const today = todayInVenueDate();
    return getEffectiveHoursForDate(today);
  },
  ['public-effective-hours-today'],
  { tags: ['hours'], revalidate: 60 },
);

export async function getPublicEffectiveHoursToday(): Promise<EffectiveHours> {
  return withFallback(
    'getPublicEffectiveHoursToday',
    _getPublicEffectiveHoursTodayCached,
    CLOSED_EFFECTIVE_HOURS,
  );
}

// ─── Team ─────────────────────────────────────────────────────────────────────

/**
 * Return all team members, shaped as the TeamMember[] fixture type.
 * Members with an imagePath get an imageUrl field from Supabase Storage.
 */
const _getPublicTeamCached = unstable_cache(
  async (): Promise<TeamMember[]> => {
    const rows = await listTeamMembers();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      bio: row.bio,
      imageUrl: resolveImageUrl(row.imagePath),
    }));
  },
  ['public-team'],
  { tags: ['team'] },
);

export async function getPublicTeam(): Promise<TeamMember[]> {
  return withFallback('getPublicTeam', _getPublicTeamCached, []);
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

/**
 * Return all gallery images, shaped as the GalleryImage[] fixture type.
 * imagePath is resolved to a full public URL exposed as `src`.
 *
 * Note: width/height are not stored in the DB — the fixture type includes them
 * but the public page must handle null/zero gracefully until Phase 9 when we
 * add image dimensions to the schema.
 */
const _getPublicGalleryCached = unstable_cache(
  async (): Promise<GalleryImage[]> => {
    const rows = await listGalleryImages();
    return rows.map((row) => ({
      id: row.id,
      src: resolveImageUrl(row.imagePath) ?? '',
      alt: row.alt,
      width: 0,
      height: 0,
      caption: null,
      tags: row.tags,
    }));
  },
  ['public-gallery'],
  { tags: ['gallery'] },
);

export async function getPublicGallery(): Promise<GalleryImage[]> {
  return withFallback('getPublicGallery', _getPublicGalleryCached, []);
}

// ─── Careers ──────────────────────────────────────────────────────────────────

/**
 * Return open career postings, shaped as the Posting[] fixture type.
 */
const _getPublicCareerPostingsCached = unstable_cache(
  async (): Promise<Posting[]> => {
    const rows = await listPostings({ onlyOpen: true });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type === 'full_time' ? 'full-time' : 'part-time',
      department: row.department,
      description: row.description,
      responsibilities: row.responsibilities,
      requirements: row.requirements,
      isOpen: row.isOpen,
    }));
  },
  ['public-career-postings'],
  { tags: ['careers'] },
);

export async function getPublicCareerPostings(): Promise<Posting[]> {
  return withFallback('getPublicCareerPostings', _getPublicCareerPostingsCached, []);
}

// ─── Content blocks ───────────────────────────────────────────────────────────

/**
 * Fixture fallbacks for content blocks, keyed by ContentBlockKey.
 * These match FIXTURE_FALLBACKS in lib/db/queries/content-blocks.ts and are
 * used as DB-outage fallbacks (distinct from parse-failure fallbacks).
 */
const CONTENT_BLOCK_FALLBACKS: {
  home_hero: HomeHeroValue;
  home_callouts: HomeCalloutsValue;
  about_body: AboutBodyValue;
} = {
  home_hero: hero,
  home_callouts: homeCallouts,
  about_body: {
    headline: aboutContent.headline,
    lead: aboutContent.lead,
    paragraphs: aboutContent.paragraphs,
    rfidSteps: aboutContent.rfidSteps,
    values: aboutContent.values,
  },
};

/**
 * Value type map — narrows the return type per key, matching ContentBlockRow<K>.value.
 */
type ContentBlockValueMap = {
  home_hero: HomeHeroValue;
  home_callouts: HomeCalloutsValue;
  about_body: AboutBodyValue;
};

/**
 * Factory: returns a cached function for the given content block key.
 *
 * Usage:
 *   const getHero = getPublicContentBlock('home_hero');
 *   const hero = await getHero();
 *
 * Each key gets its own cache entry and tag so revalidation is surgical.
 * Supported tags: 'content:home_hero', 'content:home_callouts', 'content:about_body'
 *
 * On DB error, returns the matching fixture value WITHOUT caching it.
 */
export function getPublicContentBlock<K extends ContentBlockKey>(key: K) {
  const cachedFn = unstable_cache(
    async () => {
      const row = await getContentBlock(key);
      return row.value;
    },
    [`public-content-block-${key}`],
    { tags: [`content:${key}`] },
  );

  return async (): Promise<ContentBlockValueMap[K]> => {
    return withFallback(
      `getPublicContentBlock(${key})`,
      cachedFn,
      CONTENT_BLOCK_FALLBACKS[key] as ContentBlockValueMap[K],
    );
  };
}

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * Wrapper type for public event reads.
 * stale: true when the cache has never been populated or was last synced >1 hour ago.
 * lastSyncedAt: ISO string of the most recent successful sync, or null.
 */
export type PublicResult<T> = {
  data: T;
  stale: boolean;
  lastSyncedAt: string | null;
};

/** One hour in milliseconds — stale threshold for events data. */
const EVENTS_STALE_MS = 60 * 60 * 1000;

/**
 * Map a DB row to the public Event fixture type.
 * cover_image_url is nullable in the DB; the fixture type requires imageUrl: string,
 * so we emit '' when null and let the frontend handle the empty-string case.
 */
function rowToEvent(row: {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  coverImageUrl: string | null;
  externalUrl: string | null;
}): Event {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    imageUrl: row.coverImageUrl ?? '',
    ticketUrl: row.externalUrl ?? null,
    featured: false,
    tags: [],
  };
}

/**
 * Compute stale flag: true when lastSyncedAt is null or older than EVENTS_STALE_MS.
 */
function computeStale(lastSyncedAt: string | null): boolean {
  if (!lastSyncedAt) return true;
  return Date.now() - new Date(lastSyncedAt).getTime() > EVENTS_STALE_MS;
}

/**
 * Return upcoming events with staleness metadata.
 * Cached under the 'events' tag — revalidated by the cron after each sync.
 */
const _getPublicUpcomingEventsCached = unstable_cache(
  async (): Promise<PublicResult<Event[]>> => {
    const [rows, syncStatus] = await Promise.all([
      listUpcomingEventRows(),
      getEventsSyncStatus(),
    ]);
    return {
      data: rows.map(rowToEvent),
      stale: computeStale(syncStatus.lastSyncedAt),
      lastSyncedAt: syncStatus.lastSyncedAt,
    };
  },
  ['public-upcoming-events'],
  { tags: ['events'] },
);

export async function getPublicUpcomingEvents(): Promise<PublicResult<Event[]>> {
  const fixtureUpcoming = await getUpcomingEvents();
  const fallback: PublicResult<Event[]> = {
    data: fixtureUpcoming,
    stale: true,
    lastSyncedAt: null,
  };
  return withFallback('getPublicUpcomingEvents', _getPublicUpcomingEventsCached, fallback);
}

/**
 * Return past events with staleness metadata.
 * Cached under the 'events' tag — revalidated by the cron after each sync.
 */
const _getPublicPastEventsCached = unstable_cache(
  async (): Promise<PublicResult<Event[]>> => {
    const [rows, syncStatus] = await Promise.all([
      listPastEventRows(),
      getEventsSyncStatus(),
    ]);
    return {
      data: rows.map(rowToEvent),
      stale: computeStale(syncStatus.lastSyncedAt),
      lastSyncedAt: syncStatus.lastSyncedAt,
    };
  },
  ['public-past-events'],
  { tags: ['events'] },
);

export async function getPublicPastEvents(): Promise<PublicResult<Event[]>> {
  const fixturePast = await getPastEvents();
  const fallback: PublicResult<Event[]> = {
    data: fixturePast,
    stale: true,
    lastSyncedAt: null,
  };
  return withFallback('getPublicPastEvents', _getPublicPastEventsCached, fallback);
}

/**
 * Return a single event by slug, or null if not found / soft-deleted.
 * Cached under the 'events' tag.
 */
const _getPublicEventBySlugCached = unstable_cache(
  async (slug: string): Promise<Event | null> => {
    const row = await getEventRowBySlug(slug);
    if (!row) return null;
    return rowToEvent(row);
  },
  ['public-event-by-slug'],
  { tags: ['events'] },
);

export async function getPublicEventBySlug(slug: string): Promise<Event | null> {
  const fixtureEvent = getEventBySlug(slug) ?? null;
  return withFallback(
    `getPublicEventBySlug(${slug})`,
    () => _getPublicEventBySlugCached(slug),
    fixtureEvent,
  );
}

/**
 * Return sync status for the public "Last updated…" line and the admin card.
 * Cached under the 'events' tag.
 */
const _getEventsSyncStatusCachedFn = unstable_cache(
  async (): Promise<EventsSyncStatus> => getEventsSyncStatus(),
  ['public-events-sync-status'],
  { tags: ['events'] },
);

const NEVER_SYNCED_STATUS: EventsSyncStatus = {
  lastSyncedAt: null,
  upcomingCount: 0,
};

export async function getEventsSyncStatusCached(): Promise<EventsSyncStatus> {
  return withFallback(
    'getEventsSyncStatusCached',
    _getEventsSyncStatusCachedFn,
    NEVER_SYNCED_STATUS,
  );
}

/**
 * Return all event slugs for generateStaticParams.
 * Cached under the 'events' tag.
 */
const _getPublicEventSlugsCached = unstable_cache(
  async (): Promise<string[]> => listEventSlugs(),
  ['public-event-slugs'],
  { tags: ['events'] },
);

export async function getPublicEventSlugs(): Promise<string[]> {
  return withFallback('getPublicEventSlugs', _getPublicEventSlugsCached, []);
}

export interface EventSlugWithDate {
  slug: string;
  updatedAt: Date;
}

/**
 * Return all event slugs with their updatedAt timestamps for sitemap generation.
 * Cached under the 'events' tag.
 */
const _getPublicEventSlugsWithDatesCached = unstable_cache(
  async (): Promise<EventSlugWithDate[]> => {
    const rows = await db
      .select({
        slug: eventsCache.slug,
        updatedAt: eventsCache.updatedAt,
      })
      .from(eventsCache)
      .where(isNull(eventsCache.deletedAt));
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt }));
  },
  ['public-event-slugs-with-dates'],
  { tags: ['events'] },
);

export async function getPublicEventSlugsWithDates(): Promise<EventSlugWithDate[]> {
  return withFallback('getPublicEventSlugsWithDates', _getPublicEventSlugsWithDatesCached, []);
}

// ─── Merch ────────────────────────────────────────────────────────────────────

/**
 * Return public merch products from the merch_products mirror table.
 *
 * stale: true when zero rows are returned (table not yet populated or all
 * products soft-deleted). On DB error falls back to mock fixtures and marks
 * stale: true — same pattern as events.
 *
 * imageUrl: derived from row.imagePath via getPublicUrl when imagePath is set;
 * falls back to '' when the product has no mirrored image (the card handles
 * the empty string case with a placeholder).
 *
 * The `id` field is set to the printifyProductId string so it serves as the
 * stable key consumed by MerchBrowser / MerchCard.
 */
const _getPublicMerchProductsCached = unstable_cache(
  async (): Promise<{ data: MerchProduct[]; stale: boolean }> => {
    const rows = await listMerchProductRows();
    if (rows.length === 0) {
      return { data: mockProducts, stale: true };
    }
    const data: MerchProduct[] = rows.map((row) => ({
      id: row.printifyProductId,
      title: row.title,
      priceCents: row.priceCents,
      imageUrl: row.imagePath
        ? getPublicUrl({ bucket: 'media', path: row.imagePath })
        : '',
      printifyUrl: row.printifyUrl,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      category: row.category,
    }));
    return { data, stale: false };
  },
  ['public-merch'],
  { tags: ['merch'] },
);

export async function getPublicMerchProducts(): Promise<{
  data: MerchProduct[];
  stale: boolean;
}> {
  return withFallback(
    'getPublicMerchProducts',
    _getPublicMerchProductsCached,
    { data: mockProducts, stale: true },
  );
}
