import { z } from 'zod';

// ─── Const tuples ─────────────────────────────────────────────────────────────

export const EMPLOYMENT_TYPES = ['full_time', 'part_time'] as const;

export const APPLICATION_STATUSES = ['new', 'reviewed', 'archived'] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// ─── Shared field helpers ─────────────────────────────────────────────────────

/** Coerce empty string to null; trim; enforce ≤4000 chars. */
const nullableInternalNotes = z
  .string()
  .max(4000, 'Internal notes must be 4000 characters or fewer')
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v === '' || v == null ? null : v));

/**
 * A single text entry in a responsibilities or requirements array.
 * Trims whitespace and rejects empty strings and entries over 300 chars.
 */
const arrayEntry = z
  .string()
  .trim()
  .min(1, 'Entry must not be empty')
  .max(300, 'Entry must be 300 characters or fewer');

/**
 * Array of text entries — trimmed, non-empty, max 300 chars each, max 20 entries.
 */
const textArray = z
  .array(arrayEntry)
  .max(20, 'At most 20 entries are allowed');

// ─── Posting schema (create / update) ────────────────────────────────────────

/**
 * Validates a career posting create or update payload.
 * Zod enforces per-element length on responsibilities and requirements because
 * SQL CHECK constraints on individual array elements are impractical — the DB
 * schema constrains only column-level text[] type.
 */
export const postingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or fewer'),
  type: z.enum(EMPLOYMENT_TYPES, {
    error: 'Type must be full_time or part_time',
  }),
  department: z
    .string()
    .trim()
    .min(1, 'Department is required')
    .max(80, 'Department must be 80 characters or fewer'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  responsibilities: textArray,
  requirements: textArray,
  isOpen: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export type PostingInput = z.infer<typeof postingSchema>;

// ─── List postings filter ─────────────────────────────────────────────────────

/**
 * Query filters for the admin postings list view.
 * status: 'open' = is_open = true, 'closed' = is_open = false, 'all' = no filter.
 * q: substring search across title / department / description.
 */
export const listPostingsFilterSchema = z.object({
  status: z.enum(['open', 'closed', 'all']).optional(),
  q: z.string().trim().optional(),
});

export type ListPostingsFilterInput = z.infer<typeof listPostingsFilterSchema>;

// ─── Application status update ────────────────────────────────────────────────

/**
 * Validates an admin status-transition payload.
 * Optionally carries updated internal_notes in the same round-trip.
 */
export const updateApplicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
  internalNotes: nullableInternalNotes,
});

export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;

// ─── Application notes-only update ───────────────────────────────────────────

/**
 * Validates a notes-only update (does not touch status or handled_at).
 */
export const updateApplicationNotesSchema = z.object({
  internalNotes: nullableInternalNotes,
});

export type UpdateApplicationNotesInput = z.infer<
  typeof updateApplicationNotesSchema
>;

// ─── List applications filter ─────────────────────────────────────────────────

/**
 * Query filters for the admin applications list view.
 * status: 'all' is the sentinel meaning "no status filter".
 * postingId: optional UUID to scope to a single posting.
 * q: substring search across name / email.
 */
export const listApplicationsFilterSchema = z.object({
  status: z.enum([...APPLICATION_STATUSES, 'all'] as [string, ...string[]]).optional(),
  postingId: z.string().uuid('postingId must be a valid UUID').optional(),
  q: z.string().trim().optional(),
});

export type ListApplicationsFilterInput = z.infer<
  typeof listApplicationsFilterSchema
>;

// ─── Public application schema (Phase 7) ─────────────────────────────────────

/**
 * Validates a public career application submission.
 * Exported here so Phase 7 can import it without modification.
 * The server action will enforce consent = true before inserting.
 */
export const createApplicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be 80 characters or fewer'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(320, 'Email must be 320 characters or fewer')
    .email('Email must be a valid email address'),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone must be 30 characters or fewer')
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  postingId: z
    .string()
    .uuid('postingId must be a valid UUID')
    .optional()
    .nullable(),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(4000, 'Message must be 4000 characters or fewer'),
  consent: z.literal(true, {
    error: 'You must consent to submit an application',
  }),
  resumePath: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v)),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
