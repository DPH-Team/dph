import 'server-only';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { weeklyHours } from '@/lib/db/schema';
import type { WeeklyHourRow } from '@/lib/db/schema';
import type { WeeklyHourRowInput } from '@/lib/validators/hours';
import type { DayOfWeek } from '@/lib/validators/hours';

// ─── Canonical day ordering (mon → sun) ──────────────────────────────────────

const DOW_ORDER_EXPR = sql`array_position(
  array['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::day_of_week[],
  ${weeklyHours.dayOfWeek}
)`;

// ─── Read queries ─────────────────────────────────────────────────────────────

/**
 * Return all 7 weekly-hours rows ordered Monday → Sunday.
 */
export async function listWeeklyHours(): Promise<WeeklyHourRow[]> {
  return db.select().from(weeklyHours).orderBy(DOW_ORDER_EXPR);
}

/**
 * Return the weekly-hours row for a specific day-of-week, or null if not found.
 */
export async function getWeeklyHourByDow(
  dow: DayOfWeek,
): Promise<WeeklyHourRow | null> {
  const rows = await db
    .select()
    .from(weeklyHours)
    .where(eq(weeklyHours.dayOfWeek, dow))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Write queries ────────────────────────────────────────────────────────────

/**
 * Atomically replace all 7 weekly-hours rows via upsert inside a transaction.
 * Each row is inserted; on conflict on day_of_week the row is updated in-place.
 * Returns the resulting 7 rows in canonical Monday → Sunday order.
 *
 * Does NOT delete-then-insert — pure upsert preserves trigger semantics.
 */
export async function replaceWeeklyHours(
  rows: WeeklyHourRowInput[],
  actorId: string,
): Promise<WeeklyHourRow[]> {
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(weeklyHours)
        .values({
          dayOfWeek: row.dayOfWeek,
          closed: row.closed,
          openTime: row.openTime ?? null,
          closeTime: row.closeTime ?? null,
          updatedBy: actorId,
        })
        .onConflictDoUpdate({
          target: weeklyHours.dayOfWeek,
          set: {
            closed: sql`excluded.closed`,
            openTime: sql`excluded.open_time`,
            closeTime: sql`excluded.close_time`,
            updatedAt: sql`now()`,
            updatedBy: actorId,
          },
        });
    }
  });

  return db.select().from(weeklyHours).orderBy(DOW_ORDER_EXPR);
}
