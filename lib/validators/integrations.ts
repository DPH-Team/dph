import { z } from 'zod';

// ─── Integration names ────────────────────────────────────────────────────────

export const INTEGRATION_NAMES = ['untappd', 'printify'] as const;
export type IntegrationName = (typeof INTEGRATION_NAMES)[number];

// ─── Untappd credentials ──────────────────────────────────────────────────────

/**
 * Untappd credential schema.
 * The read_write_token is a single token covering both tap list and events sync
 * (per PHASES.md Phase 6 — there is no separate read token).
 */
export const untappdCredentialsSchema = z.object({
  location_id: z
    .string()
    .trim()
    .min(1, 'Location ID is required')
    .max(50, 'Location ID must be 50 characters or fewer'),
  read_write_token: z
    .string()
    .trim()
    .min(1, 'Read/write token is required')
    .max(200, 'Token must be 200 characters or fewer'),
});

export type UntappdCredentials = z.infer<typeof untappdCredentialsSchema>;

// ─── Printify credentials ─────────────────────────────────────────────────────

export const printifyCredentialsSchema = z.object({
  api_key: z
    .string()
    .trim()
    .min(1, 'API key is required')
    .max(200, 'API key must be 200 characters or fewer'),
  shop_id: z
    .string()
    .trim()
    .min(1, 'Shop ID is required')
    .max(50, 'Shop ID must be 50 characters or fewer'),
});

export type PrintifyCredentials = z.infer<typeof printifyCredentialsSchema>;

// ─── Mode / enabled toggle ────────────────────────────────────────────────────

export const integrationTogglesSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['mock', 'live']),
});

export type IntegrationTogglesInput = z.infer<typeof integrationTogglesSchema>;

// ─── Discriminated helpers ────────────────────────────────────────────────────

/**
 * Return the credentials schema for the given integration name.
 * Switch on name — safe to call from a server action.
 */
export function getCredentialsSchema(name: IntegrationName) {
  switch (name) {
    case 'untappd':
      return untappdCredentialsSchema;
    case 'printify':
      return printifyCredentialsSchema;
  }
}
