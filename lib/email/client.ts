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
 * Returns the singleton Resend client, initialised lazily on first call.
 *
 * If RESEND_API_KEY is absent (e.g. local dev without credentials) the
 * function returns null and the caller must handle the no-op path.
 * Use `getResendClient()` only inside `lib/email/send.ts` — never call it
 * directly from a server action.
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
