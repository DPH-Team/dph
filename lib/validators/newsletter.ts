import { z } from 'zod';

// ─── Const tuples ─────────────────────────────────────────────────────────────

/**
 * Valid status values for subscriber filtering.
 * 'all' is the sentinel meaning "no status filter applied" — it is NOT stored
 * in the DB; it only appears in filter payloads.
 */
export const SUBSCRIBER_STATUSES = ['active', 'unsubscribed'] as const;

export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number];

// ─── Public subscribe schema ──────────────────────────────────────────────────

/**
 * Validates the newsletter subscribe payload submitted by anonymous visitors.
 * - Lowercases + trims the email before storage (matches the DB lowercase check).
 * - Re-used by Phase 7's public form server action.
 */
export const subscribeNewsletterSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .max(320, 'Email must be 320 characters or fewer'),
});

export type SubscribeNewsletterInput = z.infer<typeof subscribeNewsletterSchema>;

// ─── Admin list filter schema ─────────────────────────────────────────────────

/**
 * Query filters for the admin subscribers list view.
 * status: 'active' | 'unsubscribed' | 'all' — 'all' means no status filter.
 * search: optional ilike match against email.
 */
export const listSubscribersFilterSchema = z.object({
  status: z
    .enum([...SUBSCRIBER_STATUSES, 'all'] as [string, ...string[]])
    .optional(),
  search: z.string().trim().optional(),
});

export type ListSubscribersFilterInput = z.infer<
  typeof listSubscribersFilterSchema
>;
