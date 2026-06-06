import { z } from 'zod';

// ─── Const tuples ─────────────────────────────────────────────────────────────

/**
 * Canonical subscriber states (double opt-in model, Phase 7).
 *   pending      — confirmed_at IS NULL AND unsubscribed_at IS NULL
 *   confirmed    — confirmed_at IS NOT NULL AND unsubscribed_at IS NULL
 *   unsubscribed — unsubscribed_at IS NOT NULL
 *
 * 'all' is the sentinel meaning "no status filter applied" — it is NOT stored
 * in the DB; it only appears in filter payloads.
 *
 * Back-compat alias: 'active' is accepted by the filter schema and treated as
 * 'confirmed' so existing admin URLs/bookmarks keep working.
 */
export const SUBSCRIBER_STATUSES = [
  'pending',
  'confirmed',
  'unsubscribed',
] as const;

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
 * All status values accepted by the admin filter UI.
 * Includes 'all' (no-filter sentinel) and 'active' (back-compat alias for
 * 'confirmed'). The alias is resolved to 'confirmed' in the query helpers.
 */
export const SUBSCRIBER_FILTER_STATUSES = [
  ...SUBSCRIBER_STATUSES,
  'all',
  'active',
] as const;

export type SubscriberFilterStatus = (typeof SUBSCRIBER_FILTER_STATUSES)[number];

/**
 * Normalise the raw filter status accepted from query params into the canonical
 * status value used by query helpers. 'active' → 'confirmed' for back-compat.
 */
export function normaliseFilterStatus(
  raw: SubscriberFilterStatus | undefined,
): SubscriberStatus | 'all' | undefined {
  if (raw === 'active') return 'confirmed';
  return raw as SubscriberStatus | 'all' | undefined;
}

/**
 * Query filters for the admin subscribers list view.
 * status: 'pending' | 'confirmed' | 'unsubscribed' | 'all' | 'active'
 *   'all'    — no status filter applied (shows all rows).
 *   'active' — legacy alias accepted for back-compat; normalise with
 *              normaliseFilterStatus() before passing to query helpers.
 * search: optional ilike match against email.
 */
export const listSubscribersFilterSchema = z.object({
  status: z.enum(SUBSCRIBER_FILTER_STATUSES).optional(),
  search: z.string().trim().optional(),
});

export type ListSubscribersFilterInput = z.infer<
  typeof listSubscribersFilterSchema
>;
