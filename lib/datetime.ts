/**
 * lib/datetime.ts — Venue-aware datetime formatting for District Pour Haus.
 *
 * All display goes through Intl.DateTimeFormat with timeZone: VENUE_TZ so the
 * owner always sees times in America/Chicago regardless of server or browser TZ.
 *
 * No external date library dependencies — only built-in Intl APIs.
 */

export const VENUE_TZ = 'America/Chicago';

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Format a UTC Date for display in venue local time.
 * Example: 'Mon, Jun 15 · 5:00 PM CDT'
 */
export function formatEventDateTime(d: Date): string {
  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);

  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);

  return `${datePart} · ${timePart}`;
}

/**
 * Format a date range. If endsAt is null/undefined, returns a single timestamp.
 * Collapses the timezone suffix to appear only once at the end.
 *
 * Examples:
 *   'Mon, Jun 15 · 5–9 PM CDT'
 *   'Mon, Jun 15 · 5:00 PM CDT'
 */
export function formatEventRange(starts: Date, ends?: Date | null): string {
  const datePart = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(starts);

  if (!ends) {
    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: VENUE_TZ,
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(starts);
    return `${datePart} · ${timePart}`;
  }

  // Both times: use the same meridiem/TZ suffix strategy.
  // Format start without TZ and end with TZ; if both are on the same AM/PM,
  // we can omit the meridiem on start for a cleaner "5–9 PM CDT" display.
  const startFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    hour: 'numeric',
    minute: '2-digit',
  });
  const endFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const startStr = startFmt.format(starts);
  const endStr = endFmt.format(ends);

  // If start minute is :00, strip it for cleaner display (e.g. "5" not "5:00")
  const cleanStart = startStr.replace(/:00(?= [AP]M)/, '');

  return `${datePart} · ${cleanStart}–${endStr}`;
}

/**
 * Format a date-only string for table cells.
 * Example: 'Jun 15, 2026'
 */
export function formatEventDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

// ─── Input conversion helpers ─────────────────────────────────────────────────

/**
 * Convert a datetime-local string (e.g. '2026-06-15T17:00') interpreted as
 * America/Chicago to a UTC Date.
 *
 * Strategy: use Intl.DateTimeFormat formatToParts to find the TZ offset at the
 * given local wall-clock time, then subtract that offset from the local epoch.
 *
 * Note: this approach has a 1-hour ambiguity during the "fall-back" hour; for
 * event scheduling we pick the first occurrence (pre-transition), which is the
 * expected behavior.
 */
export function venueLocalToUTC(localInput: string): Date {
  // Parse the datetime-local string as if it were UTC, then correct for offset.
  // We use a two-step approach: construct an approximate UTC candidate, compute
  // the offset at that instant in VENUE_TZ, then subtract that offset.
  const naiveUtc = new Date(localInput + 'Z'); // treat as UTC momentarily

  // Get the UTC offset in minutes at this approximate instant in VENUE_TZ.
  // formatToParts gives us the local time components; comparing them with the
  // UTC values yields the offset.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(naiveUtc);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  const localYear = get('year');
  const localMonth = get('month') - 1; // 0-indexed
  const localDay = get('day');
  let localHour = get('hour');
  const localMinute = get('minute');

  // Intl uses 24 for midnight in some locales — normalize to 0.
  if (localHour === 24) localHour = 0;

  // The offset in ms = difference between the naive UTC epoch and
  // the epoch that would produce those local components.
  const localAsUtcMs = Date.UTC(
    localYear,
    localMonth,
    localDay,
    localHour,
    localMinute,
  );
  const offsetMs = naiveUtc.getTime() - localAsUtcMs;

  // The actual input in local time parsed as UTC epoch:
  const inputAsUtcMs = new Date(localInput + 'Z').getTime();

  return new Date(inputAsUtcMs + offsetMs);
}

// ─── Venue-date helpers ────────────────────────────────────────────────────────

/**
 * Return the YYYY-MM-DD calendar date of a given Date as observed in VENUE_TZ
 * (America/Chicago).
 *
 * Uses `en-CA` locale with `Intl.DateTimeFormat` because that locale produces
 * the ISO `YYYY-MM-DD` format natively, so no manual zero-padding is required.
 * The result is always correct for America/Chicago regardless of what timezone
 * the server or browser runs in.
 *
 * Example: venueDateOf(new Date('2026-06-05T04:00:00Z')) → '2026-06-04'
 * (midnight UTC on Jun 5 is still Jun 4 in Chicago, which is UTC-5 in winter /
 * UTC-6 in summer — the Intl API handles DST automatically.)
 */
export function venueDateOf(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    // en-CA produces 'YYYY-MM-DD' natively
    timeZone: VENUE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Return today's date in the venue's local timezone as a YYYY-MM-DD string.
 *
 * Delegates to `venueDateOf(new Date())` so there is a single implementation
 * of the VENUE_TZ date extraction logic.
 */
export function todayInVenueDate(): string {
  return venueDateOf(new Date());
}

/**
 * Return true iff the given Date falls on today's calendar date in VENUE_TZ
 * (America/Chicago).
 *
 * Uses a YYYY-MM-DD string comparison, which is safe and correct because the
 * format is zero-padded and lexicographically ordered.
 */
export function isTodayInVenue(d: Date): boolean {
  return venueDateOf(d) === todayInVenueDate();
}

/**
 * Return true iff the given Date's calendar date in VENUE_TZ is strictly
 * before today's calendar date in VENUE_TZ.
 *
 * Uses YYYY-MM-DD string comparison (safe for ISO dates — zero-padded,
 * lexicographically ordered). An event whose venue day is today returns false;
 * only events whose venue day is already over return true.
 *
 * Example usage: filter out past events while keeping today's events visible
 * for the entire calendar day regardless of what time it is.
 */
export function isPastVenueDay(d: Date): boolean {
  return venueDateOf(d) < todayInVenueDate();
}

/**
 * Derive the day-of-week for a YYYY-MM-DD date string interpreted in venue
 * local time.
 *
 * We anchor to noon (T12:00:00) in venue local time before constructing the
 * Date so that DST transitions around midnight can never shift the wall-clock
 * date to the previous or following day.
 *
 * Returns a lowercase English weekday name that matches the `day_of_week`
 * DB enum: 'monday' | 'tuesday' | … | 'sunday'.
 */
export function venueDateToDow(
  date: string,
): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
  // Construct a Date that represents noon on the given calendar date in venue TZ.
  // Using the datetime-local string appended with the TZ offset would be cleaner
  // but is fragile across DST. Instead we parse as if UTC-noon and then use Intl
  // to read back the weekday — the noon anchor means the date cannot flip.
  const d = new Date(`${date}T12:00:00`);

  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    weekday: 'long',
  })
    .format(d)
    .toLowerCase() as
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';

  return weekday;
}

/**
 * Convert a UTC Date to the 'YYYY-MM-DDTHH:mm' string expected by
 * <input type="datetime-local">, expressed in America/Chicago.
 */
export function utcToVenueLocalInput(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  let hour = get('hour');
  const minute = get('minute');

  // Intl may return '24' for midnight — normalize to '00'.
  if (hour === '24') hour = '00';

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
