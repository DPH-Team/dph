import 'server-only';

import { venueDateToDow } from '@/lib/datetime';
import { getHoursOverrideByDate } from '@/lib/db/queries/hours-overrides';
import { getWeeklyHourByDow } from '@/lib/db/queries/weekly-hours';

// ─── Return type ──────────────────────────────────────────────────────────────

export interface EffectiveHours {
  closed: boolean;
  openTime: string | null;
  closeTime: string | null;
  source: 'override' | 'weekly' | 'none';
  note: string | null;
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Return the effective hours for a given calendar date (YYYY-MM-DD).
 *
 * Algorithm:
 * 1. Derive the day-of-week from the date string interpreted in venue local
 *    time (uses venueDateToDow from lib/datetime.ts — anchors to noon to
 *    avoid DST edge cases).
 * 2. Run the override and weekly-hours lookups in parallel.
 * 3. Override wins if present; weekly row is the fallback; neither → closed.
 *
 * The date parameter is assumed to already be in YYYY-MM-DD venue-local format.
 * Callers should derive it with todayInVenueDate() from lib/datetime.ts.
 */
export async function getEffectiveHoursForDate(
  date: string,
): Promise<EffectiveHours> {
  const dow = venueDateToDow(date);

  const [override, weekly] = await Promise.all([
    getHoursOverrideByDate(date),
    getWeeklyHourByDow(dow),
  ]);

  if (override) {
    return {
      closed: override.closed,
      openTime: override.openTime ?? null,
      closeTime: override.closeTime ?? null,
      source: 'override',
      note: override.note ?? null,
    };
  }

  if (weekly) {
    return {
      closed: weekly.closed,
      openTime: weekly.openTime ?? null,
      closeTime: weekly.closeTime ?? null,
      source: 'weekly',
      note: null,
    };
  }

  return { closed: true, openTime: null, closeTime: null, source: 'none', note: null };
}
