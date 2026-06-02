import 'server-only';

/**
 * Canonical "from" address for all outbound transactional emails.
 *
 * Precedence (highest first):
 *   1. Admin integration config `from_email` (passed as argument when available)
 *   2. RESEND_FROM_EMAIL env var
 *   3. Hardcoded default
 *
 * The admin-resolved value is passed in by `send.ts` — this function does NOT
 * call `getResendConfig()` itself to avoid circular dependencies and to keep
 * the function synchronous.
 */
export function getFromAddress(adminFromEmail?: string): string {
  if (adminFromEmail && adminFromEmail.trim()) return adminFromEmail.trim();
  return process.env.RESEND_FROM_EMAIL ?? 'District Pour Haus <hello@districtpourhaus.com>';
}

/**
 * Reply-to address for outbound email.
 *
 * Precedence (highest first):
 *   1. Admin integration config `reply_to` (passed as argument when available)
 *   2. RESEND_REPLY_TO env var
 *   3. The resolved from address
 *
 * The admin-resolved value is passed in by `send.ts`.
 */
export function getReplyTo(adminReplyTo?: string, adminFromEmail?: string): string {
  if (adminReplyTo && adminReplyTo.trim()) return adminReplyTo.trim();
  return process.env.RESEND_REPLY_TO ?? getFromAddress(adminFromEmail);
}
