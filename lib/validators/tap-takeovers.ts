import { z } from 'zod';

// ─── Tap takeover schemas ──────────────────────────────────────────────────────

/**
 * Validates the inputs for scheduling a new tap takeover.
 *
 * brewery: 1–200 characters, trimmed.
 * date:    YYYY-MM-DD string that must be a real calendar date.
 *
 * Past dates are NOT hard-blocked here — the admin UI sets min=today on the
 * date input, keeping the validator lenient for record integrity (e.g. seeding
 * historical records).
 */
export const createTakeoverSchema = z.object({
  brewery: z
    .string()
    .min(1, 'Brewery name is required')
    .max(200, 'Brewery name must be 200 characters or fewer')
    .trim(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (d) => Number.isFinite(Date.parse(`${d}T00:00:00`)),
      'Date must be a valid calendar date',
    ),
});

export type CreateTakeoverInput = z.infer<typeof createTakeoverSchema>;

/**
 * Validates the id for deleting a scheduled tap takeover.
 */
export const deleteTakeoverSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type DeleteTakeoverInput = z.infer<typeof deleteTakeoverSchema>;
