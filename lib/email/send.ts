import 'server-only';

import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { getResendClient } from './client';
import { getFromAddress, getReplyTo } from './addresses';

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
 * Dev fallback: if RESEND_API_KEY is absent the send is skipped silently
 * and returns `{ ok: true, skipped: true }`.
 */
export async function sendEmail(opts: SendEmailOpts): Promise<SendEmailResult> {
  const { to, subject, react, replyTo, template } = opts;

  const client = getResendClient();
  if (!client) {
    // No-op in dev — key absent
    return { ok: true, skipped: true };
  }

  let html: string;
  try {
    html = await render(react);
  } catch (err) {
    console.error(`[email] ${template} render failed:`, err);
    return { ok: false };
  }

  try {
    const result = await client.emails.send({
      from: getFromAddress(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo ?? getReplyTo(),
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
