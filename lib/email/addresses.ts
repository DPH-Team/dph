import 'server-only';

/**
 * Canonical "from" address for all outbound transactional emails.
 * Example: "Pour Haus <hello@districtpourhaus.com>"
 */
export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'District Pour Haus <hello@districtpourhaus.com>';
}

/**
 * Reply-to address for outbound email. Falls back to the from address.
 * Set RESEND_REPLY_TO if you want replies routed somewhere else (e.g. a
 * shared inbox) rather than the sending address.
 */
export function getReplyTo(): string {
  return process.env.RESEND_REPLY_TO ?? getFromAddress();
}
