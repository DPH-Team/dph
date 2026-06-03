import { z } from 'zod';

// ─── Integration names ────────────────────────────────────────────────────────

export const INTEGRATION_NAMES = ['untappd', 'printify', 'plausible', 'resend', 'instagram'] as const;
export type IntegrationName = (typeof INTEGRATION_NAMES)[number];

// ─── Untappd credentials ──────────────────────────────────────────────────────

/**
 * Untappd credential schema.
 *
 * Auth is HTTP Basic (NOT Bearer): the Authorization header is built as
 *   Authorization: Basic <base64(email + ":" + read_write_token)>
 * per the official Untappd for Business API docs.
 *
 * Fields:
 *   email           — the email address used to log into business.untappd.com
 *   location_id     — found in Settings & Integrations > Location Settings
 *   read_write_token — the Read & Write API token from business.untappd.com/account
 *
 * The read_write_token covers both tap list (menus endpoint) and events sync.
 */
export const untappdCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter the account email for your Untappd for Business login')
    .max(120, 'Email must be 120 characters or fewer'),
  location_id: z
    .string()
    .trim()
    .min(1, 'Location ID is required')
    .max(50, 'Location ID must be 50 characters or fewer'),
  read_write_token: z
    .string()
    .trim()
    .min(1, 'Read/write token is required')
    .max(4096, 'Token must be 4096 characters or fewer'),
});

export type UntappdCredentials = z.infer<typeof untappdCredentialsSchema>;

// ─── Printify credentials ─────────────────────────────────────────────────────

export const printifyCredentialsSchema = z.object({
  api_key: z
    .string()
    .trim()
    .min(1, 'API key is required')
    .max(4096, 'API key must be 4096 characters or fewer'),
  shop_id: z
    .string()
    .trim()
    .min(1, 'Shop ID is required')
    .max(50, 'Shop ID must be 50 characters or fewer'),
});

export type PrintifyCredentials = z.infer<typeof printifyCredentialsSchema>;

// ─── Plausible config ─────────────────────────────────────────────────────────
//
// Plausible domain + host are NOT secrets — both appear in the public script tag.
// They are stored in the `config` jsonb column (not the encrypted credentials
// column) for consistency. The `enabled` boolean on the row gates injection.

export const plausibleConfigSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, 'Domain is required')
    .max(253, 'Domain must be 253 characters or fewer')
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      'Enter a valid domain (e.g. staging.districtpourhaus.com)',
    ),
  host: z
    .string()
    .trim()
    .url('Host must be a valid URL (e.g. https://plausible.io)')
    .max(200, 'Host must be 200 characters or fewer')
    .default('https://plausible.io'),
});

export type PlausibleConfig = z.infer<typeof plausibleConfigSchema>;

// ─── Resend credentials ───────────────────────────────────────────────────────
//
// api_key is a secret — stored in the encrypted `credentials` bytea column.
// from_email and reply_to are stored in the `config` jsonb column (not secrets).

export const resendCredentialsSchema = z.object({
  api_key: z
    .string()
    .trim()
    .min(1, 'API key is required')
    .max(200, 'API key must be 200 characters or fewer'),
});

export type ResendCredentials = z.infer<typeof resendCredentialsSchema>;

// ─── Resend config ────────────────────────────────────────────────────────────
//
// from_email and reply_to are non-secret sender addresses stored in `config`
// jsonb. The seed row intentionally uses empty strings; validation requires
// valid email format only when the values are non-empty (so the seed row
// passes). On explicit save via the admin UI both fields must be valid emails.

export const resendConfigSchema = z.object({
  from_email: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[^<]+<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(v),
      'Enter a valid email address or "Name <email>" format',
    )
    .max(320, 'From email must be 320 characters or fewer'),
  reply_to: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[^<]+<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(v),
      'Enter a valid email address or "Name <email>" format',
    )
    .max(320, 'Reply-to must be 320 characters or fewer'),
});

// Schema used on explicit admin save — both fields must be non-empty valid emails.
export const resendConfigSaveSchema = z.object({
  from_email: z
    .string()
    .trim()
    .min(1, 'From email is required')
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[^<]+<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(v),
      'Enter a valid email address or "Name <email>" format',
    )
    .max(320, 'From email must be 320 characters or fewer'),
  reply_to: z
    .string()
    .trim()
    .min(1, 'Reply-to is required')
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[^<]+<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(v),
      'Enter a valid email address or "Name <email>" format',
    )
    .max(320, 'Reply-to must be 320 characters or fewer'),
});

export type ResendConfig = z.infer<typeof resendConfigSchema>;
export type ResendConfigSave = z.infer<typeof resendConfigSaveSchema>;

// ─── Instagram config ─────────────────────────────────────────────────────────
//
// Behold feed_id is a NON-secret public identifier stored in the `config` jsonb
// column (NOT the encrypted credentials column). The empty string is intentional
// in the seed row; instagramConfigSaveSchema enforces a non-empty value on save.

/** Lenient schema — allows empty string (matches the seed row default). */
export const instagramConfigSchema = z.object({
  feed_id: z
    .string()
    .trim()
    .max(120, 'Behold feed ID must be 120 characters or fewer'),
});

/** Strict schema — used when the admin explicitly saves the config; feed_id must be non-empty. */
export const instagramConfigSaveSchema = z.object({
  feed_id: z
    .string()
    .trim()
    .min(1, 'Behold feed ID is required')
    .max(120, 'Behold feed ID must be 120 characters or fewer'),
});

export type InstagramConfig = z.infer<typeof instagramConfigSchema>;
export type InstagramConfigSave = z.infer<typeof instagramConfigSaveSchema>;

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
 * Plausible and instagram have no credentials (config is stored in jsonb, not encrypted bytea).
 * Resend stores api_key as encrypted credentials.
 */
export function getCredentialsSchema(
  name: Exclude<IntegrationName, 'plausible' | 'instagram'>,
) {
  switch (name) {
    case 'untappd':
      return untappdCredentialsSchema;
    case 'printify':
      return printifyCredentialsSchema;
    case 'resend':
      return resendCredentialsSchema;
  }
}
