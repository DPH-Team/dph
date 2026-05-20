import { z } from 'zod';

// ─── Day-of-week ──────────────────────────────────────────────────────────────

export const DAY_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayOfWeek = (typeof DAY_OF_WEEK)[number];

export const dayOfWeekSchema = z.enum(DAY_OF_WEEK);

// ─── Time regex ───────────────────────────────────────────────────────────────

/** Matches HH:MM in 24-hour format (00:00–23:59). */
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Accepts a non-empty time string matching HH:MM, or null/undefined/"".
 * Empty string is coerced to null.
 */
const nullableTime = z
  .string()
  .regex(timeRe, 'Time must be in HH:MM format (24-hour)')
  .nullable()
  .optional()
  .transform((v) => (v === '' || v == null ? null : v));

// ─── Hours override schemas ───────────────────────────────────────────────────

const hoursOverrideBaseSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine(
        (d) => Number.isFinite(Date.parse(`${d}T00:00:00`)),
        'Date must be a valid calendar date',
      ),
    closed: z.boolean().default(false),
    openTime: nullableTime,
    closeTime: nullableTime,
    note: z
      .string()
      .max(200, 'Note must be 200 characters or fewer')
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v === '' || v == null ? null : v)),
  })
  .superRefine((data, ctx) => {
    if (data.closed === true) {
      if (data.openTime != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openTime'],
          message: 'Open time must be empty when the venue is closed all day',
        });
      }
      if (data.closeTime != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closeTime'],
          message: 'Close time must be empty when the venue is closed all day',
        });
      }
    } else {
      if (data.openTime == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openTime'],
          message: 'Open time is required when the venue is open',
        });
      }
      if (data.closeTime == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closeTime'],
          message: 'Close time is required when the venue is open',
        });
      }
    }
  });

export const createHoursOverrideSchema = hoursOverrideBaseSchema;
export const updateHoursOverrideSchema = hoursOverrideBaseSchema;

export type CreateHoursOverrideInput = z.infer<typeof createHoursOverrideSchema>;
export type UpdateHoursOverrideInput = z.infer<typeof updateHoursOverrideSchema>;

// ─── Weekly schedule schemas ──────────────────────────────────────────────────

/**
 * Validates a single day's row. closed iff both times null.
 * openTime / closeTime accept HH:MM, null, undefined, or empty string.
 * Empty string is coerced to null.
 */
export const weeklyHourRowSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    closed: z.boolean().default(false),
    openTime: nullableTime,
    closeTime: nullableTime,
  })
  .superRefine((data, ctx) => {
    if (data.closed === true) {
      if (data.openTime != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openTime'],
          message: 'Open time must be empty when the venue is closed all day',
        });
      }
      if (data.closeTime != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closeTime'],
          message: 'Close time must be empty when the venue is closed all day',
        });
      }
    } else {
      if (data.openTime == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openTime'],
          message: 'Open time is required when the venue is open',
        });
      }
      if (data.closeTime == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['closeTime'],
          message: 'Close time is required when the venue is open',
        });
      }
    }
  });

/**
 * Validates a full weekly schedule (all 7 days, each dow unique).
 * The admin POSTs all 7 rows in a single atomic submit.
 */
export const weeklyScheduleSchema = z
  .object({
    days: z.array(weeklyHourRowSchema).length(7),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.days.forEach((row, i) => {
      if (seen.has(row.dayOfWeek)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days', i, 'dayOfWeek'],
          message: `Duplicate day-of-week value: ${row.dayOfWeek}`,
        });
      }
      seen.add(row.dayOfWeek);
    });
    DAY_OF_WEEK.forEach((dow) => {
      if (!seen.has(dow)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days'],
          message: `Missing required day-of-week: ${dow}`,
        });
      }
    });
  });

export type WeeklyHourRowInput = z.infer<typeof weeklyHourRowSchema>;
export type WeeklyScheduleInput = z.infer<typeof weeklyScheduleSchema>;
