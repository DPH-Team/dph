import 'server-only';

import { Resend } from 'resend';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoOpSendResult {
  skipped: true;
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _client: Resend | null = null;
let _noOp = false;

/**
 * Returns the singleton Resend client initialised with the env-var API key,
 * initialised lazily on first call.
 *
 * Prefer `getResendClientForKey()` when you have a resolved key (e.g. from
 * the admin integration config). This function is the env-var fallback path
 * and is used by `lib/email/send.ts` when the admin integration is not
 * enabled/configured.
 *
 * If RESEND_API_KEY is absent (e.g. local dev without credentials) the
 * function returns null and the caller must handle the no-op path.
 */
export function getResendClient(): Resend | null {
  if (_noOp) return null;
  if (_client) return _client;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is not set — email sending is disabled (dev fallback)');
    _noOp = true;
    return null;
  }

  _client = new Resend(apiKey);
  return _client;
}

/**
 * Returns a Resend client for an explicit API key.
 * Used when the key is read from the admin integration config rather than the
 * env var — NOT cached as a singleton (the key may change between saves).
 * Returns null if the key is an empty string.
 */
export function getResendClientForKey(apiKey: string): Resend | null {
  if (!apiKey) return null;
  return new Resend(apiKey);
}
