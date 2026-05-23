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
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { listAllItemsWithSection } from '@/lib/db/queries/menu';
import { listWeeklyHours } from '@/lib/db/queries/weekly-hours';
import { listHoursOverrides } from '@/lib/db/queries/hours-overrides';
import { getEffectiveHoursForDate } from '@/lib/db/queries/hours';
import { todayInVenueDate } from '@/lib/datetime';
import { listTeamMembers } from '@/lib/db/queries/team-members';
import { listGalleryImages } from '@/lib/db/queries/gallery';
import { listPostings } from '@/lib/db/queries/career-postings';
import { getContentBlock } from '@/lib/db/queries/content-blocks';
import { getPublicUrl } from '@/lib/supabase/storage';
import type { MenuSection, MenuItem, WeeklyHours, HoursOverride, TeamMember, GalleryImage, Posting } from '@/lib/fixtures/types';
import type { ContentBlockKey } from '@/lib/validators/content-blocks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert an imagePath stored in the DB to a full public URL.
 * Returns null when imagePath is null/undefined.
 */
function resolveImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  return getPublicUrl({ bucket: 'media', path: imagePath });
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

/**
 * Return available menu sections with their items.
 *
 * Groups the flat rows returned by listAllItemsWithSection into the MenuSection[]
 * shape that the public /menu page and the fixture getMenuSections() both use.
 * Items with an imagePath get an imageUrl field populated from Supabase Storage.
 */
export const getPublicMenu = unstable_cache(
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
        sortOrder: row.sortOrder,
      });
    }

    return Array.from(sectionMap.values()).map(({ section, items }) => ({
      id: section.id,
      name: section.name,
      description: section.description ?? null,
      sortOrder: section.sortOrder,
      items,
    }));
  },
  ['public-menu'],
  { tags: ['menu'] },
);

// ─── Hours — weekly schedule ──────────────────────────────────────────────────

/**
 * Return all 7 weekly-hours rows, shaped as the WeeklyHours fixture map.
 *
 * Missing rows (before seed) fall back to closed: true with null times.
 */
export const getPublicWeeklyHours = unstable_cache(
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

// ─── Hours — overrides (next 90 days) ────────────────────────────────────────

/**
 * Return hours overrides for the next 90 days from today.
 * Shaped as the HoursOverride[] fixture type.
 */
export const getPublicHoursOverrides = unstable_cache(
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

// ─── Hours — today's effective hours ─────────────────────────────────────────

/**
 * Return effective hours for today in venue-local time.
 *
 * This cache entry is intentionally short-lived (revalidate: 60 s) since
 * "today" advances at midnight venue-local time. The tag allows immediate
 * revalidation after an admin hours change.
 */
export const getPublicEffectiveHoursToday = unstable_cache(
  async () => {
    const today = todayInVenueDate();
    return getEffectiveHoursForDate(today);
  },
  ['public-effective-hours-today'],
  { tags: ['hours'], revalidate: 60 },
);

// ─── Team ─────────────────────────────────────────────────────────────────────

/**
 * Return all team members, shaped as the TeamMember[] fixture type.
 * Members with an imagePath get an imageUrl field from Supabase Storage.
 */
export const getPublicTeam = unstable_cache(
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

// ─── Gallery ──────────────────────────────────────────────────────────────────

/**
 * Return all gallery images, shaped as the GalleryImage[] fixture type.
 * imagePath is resolved to a full public URL exposed as `src`.
 *
 * Note: width/height are not stored in the DB — the fixture type includes them
 * but the public page must handle null/zero gracefully until Phase 9 when we
 * add image dimensions to the schema.
 */
export const getPublicGallery = unstable_cache(
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

// ─── Careers ──────────────────────────────────────────────────────────────────

/**
 * Return open career postings, shaped as the Posting[] fixture type.
 */
export const getPublicCareerPostings = unstable_cache(
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

// ─── Content blocks ───────────────────────────────────────────────────────────

/**
 * Factory: returns a cached function for the given content block key.
 *
 * Usage:
 *   const getHero = getPublicContentBlock('home_hero');
 *   const hero = await getHero();
 *
 * Each key gets its own cache entry and tag so revalidation is surgical.
 * Supported tags: 'content:home_hero', 'content:home_callouts', 'content:about_body'
 */
export function getPublicContentBlock<K extends ContentBlockKey>(key: K) {
  return unstable_cache(
    async () => {
      const row = await getContentBlock(key);
      return row.value;
    },
    [`public-content-block-${key}`],
    { tags: [`content:${key}`] },
  );
}
