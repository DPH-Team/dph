import 'server-only';

import * as React from 'react';
import { sendEmail } from './send';
import { PasswordResetRequest } from './templates/PasswordResetRequest';
import { AdminPasswordReset } from './templates/AdminPasswordReset';
import { siteUrl } from '@/lib/site-url';

// ─── Senders ──────────────────────────────────────────────────────────────────

/**
 * Send a password-reset link to the requesting user.
 * The `resetUrl` must include the one-time token and expires in 1 hour.
 * Never throws — sendEmail swallows all errors internally.
 */
export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: 'Reset your District Pour Haus password',
    react: React.createElement(PasswordResetRequest, {
      resetUrl: opts.resetUrl,
      siteUrl: siteUrl(),
    }),
    template: 'password-reset-request',
  });
}

/**
 * Notify a staff/admin user that an administrator has reset their password.
 * Displays a temporary password in a prominent monospace block.
 * Never throws — sendEmail swallows all errors internally.
 */
export async function sendAdminPasswordResetEmail(opts: {
  to: string;
  tempPassword: string;
  loginUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: 'Your District Pour Haus password has been reset',
    react: React.createElement(AdminPasswordReset, {
      tempPassword: opts.tempPassword,
      loginUrl: opts.loginUrl,
      siteUrl: siteUrl(),
    }),
    template: 'admin-password-reset',
  });
}
