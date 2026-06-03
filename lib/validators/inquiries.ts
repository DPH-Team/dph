import { z } from 'zod';

// ─── Const tuples ─────────────────────────────────────────────────────────────

export const INQUIRY_TYPES = [
  'reservation',
  'private_event',
  'press',
  'general',
] as const;

export const INQUIRY_STATUSES = ['pending', 'confirmed', 'declined'] as const;

export const SEATING_PREFERENCES = ['high_top', 'low_top'] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export type SeatingPreference = (typeof SEATING_PREFERENCES)[number];

// ─── Wire-value mapping helper ────────────────────────────────────────────────

/**
 * Maps the on-the-wire form value ('private-event') to the DB enum value
 * ('private_event'). All other values pass through unchanged.
 * Called in the public form server action before inserting.
 */
export function formTypeToDbType(formType: string): InquiryType {
  if (formType === 'private-event') return 'private_event';
  const validated = INQUIRY_TYPES.find((t) => t === formType);
  if (!validated) {
    throw new Error(`Unknown inquiry type: ${formType}`);
  }
  return validated;
}

// ─── Internal notes helper ────────────────────────────────────────────────────

/** Coerce empty string to null; trim; enforce ≤4000 chars. */
const nullableInternalNotes = z
  .string()
  .max(4000, 'Internal notes must be 4000 characters or fewer')
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v === '' || v == null ? null : v));

// ─── Admin update schemas ─────────────────────────────────────────────────────

/**
 * Validates the admin status-transition payload.
 * Optionally carries updated internal_notes in the same round-trip.
 */
export const updateInquiryStatusSchema = z.object({
  status: z.enum(INQUIRY_STATUSES),
  internalNotes: nullableInternalNotes,
});

export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusSchema>;

/**
 * Validates a notes-only update (does not touch status or handled_at).
 */
export const updateInquiryNotesSchema = z.object({
  internalNotes: nullableInternalNotes,
});

export type UpdateInquiryNotesInput = z.infer<typeof updateInquiryNotesSchema>;

// ─── List filter schema ───────────────────────────────────────────────────────

/**
 * Query filters for the admin inquiries list view.
 * 'all' is the sentinel value meaning "no filter applied".
 */
export const listInquiriesFilterSchema = z.object({
  type: z.enum([...INQUIRY_TYPES, 'all'] as [string, ...string[]]).optional(),
  status: z
    .enum([...INQUIRY_STATUSES, 'all'] as [string, ...string[]])
    .optional(),
  search: z.string().trim().optional(),
});

export type ListInquiriesFilterInput = z.infer<typeof listInquiriesFilterSchema>;
