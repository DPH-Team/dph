import 'server-only';

import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { getResendClient, getResendClientForKey } from './client';
import { getFromAddress, getReplyTo } from './addresses';
import { getResendConfig } from '@/lib/db/queries/integrations';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendEmailOpts {
  /** Recipient address(es). */
  to: string | string[];
  /** Email subject line. */
  subject: string;
  /** React Email component to render as HTML. */
  react: ReactElement;
  /**
   * Override the default reply-to. Pass the customer's email for
   * staff-notification emails so staff can reply directly.
   */
  replyTo?: string;
  /** Human-readable label used in error logs, e.g. "inquiry-staff-notification". */
  template: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** Only present if RESEND_API_KEY was absent and we skipped silently. */
  skipped?: true;
}

// ─── No-throw wrapper ─────────────────────────────────────────────────────────

/**
 * Send a transactional email via Resend.
 *
 * NEVER THROWS. Any error (network, API, render) is caught, logged, and
 * surfaces as `{ ok: false }`. This guarantees that an email failure cannot
 * fail a form submit — the DB write is always the source of truth.
 *
 * Precedence for API key and sender addresses (highest first):
 *   1. Admin integration config in the `integrations` DB table (when enabled
 *      and api_key is set).
 *   2. RESEND_* env vars (preserves pre-integration behaviour so nothing
 *      breaks when the admin integration is not yet configured).
 *
 * The api_key is NEVER passed to the client — it is decrypted server-side
 * inside `getResendConfig()` and used only to instantiate the Resend SDK here.
 *
 * Dev fallback: if neither the admin key nor RESEND_API_KEY is present, the
 * send is skipped silently and returns `{ ok: true, skipped: true }`.
 */
export async function sendEmail(opts: SendEmailOpts): Promise<SendEmailResult> {
  const { to, subject, react, replyTo, template } = opts;

  // ── Resolve API key + sender addresses (admin config takes precedence) ────────
  let adminApiKey: string | undefined;
  let adminFromEmail: string | undefined;
  let adminReplyTo: string | undefined;

  try {
    const config = await getResendConfig();
    if (config && config.enabled && config.apiKey) {
      adminApiKey = config.apiKey;
      adminFromEmail = config.fromEmail || undefined;
      adminReplyTo = config.replyTo || undefined;
    }
  } catch (err) {
    // Non-fatal — fall through to env-var path.
    console.warn('[email] getResendConfig failed, falling back to env vars:', err);
  }

  // ── Pick the Resend client ────────────────────────────────────────────────────
  const client = adminApiKey
    ? getResendClientForKey(adminApiKey)
    : getResendClient();

  if (!client) {
    // No-op in dev — neither admin key nor env var is set.
    return { ok: true, skipped: true };
  }

  // ── Resolve sender addresses ──────────────────────────────────────────────────
  const from = getFromAddress(adminFromEmail);
  // If a per-call replyTo override was provided (e.g. customer's email for staff
  // notifications), that takes the highest precedence. Otherwise fall through to
  // admin config reply_to, then env var, then from address.
  const resolvedReplyTo = replyTo ?? getReplyTo(adminReplyTo, adminFromEmail);

  // ── Render ────────────────────────────────────────────────────────────────────
  let html: string;
  try {
    html = await render(react);
  } catch (err) {
    console.error(`[email] ${template} render failed:`, err);
    return { ok: false };
  }

  // ── Send ──────────────────────────────────────────────────────────────────────
  try {
    const result = await client.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: resolvedReplyTo,
    });

    if (result.error) {
      console.error(`[email] ${template} failed:`, result.error);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error(`[email] ${template} failed:`, err);
    return { ok: false };
  }
}
