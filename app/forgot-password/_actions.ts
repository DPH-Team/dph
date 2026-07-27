'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requestPasswordResetSchema } from '@/lib/validators/users';
import { siteUrl } from '@/lib/site-url';
import { audit } from '@/lib/audit';
// Sibling agent creates this module; resolved by name at import.
import { sendPasswordResetEmail } from '@/lib/email/password-reset';
import type { ActionState } from '@/lib/types/action-state';

/**
 * requestPasswordResetAction — public action; no auth required.
 *
 * Validates the submitted email, generates a recovery link via the service-role
 * auth admin API, hands the link to the email sender, and always returns the
 * same generic success response to prevent user enumeration.
 *
 * Security notes:
 *  - hashed_token and resetUrl are NEVER written to audit_log.
 *  - Errors (e.g. user_not_found) are swallowed; the response is identical
 *    to success so the caller cannot determine whether the email exists.
 */
export async function requestPasswordResetAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const raw = { email: formData.get('email') };

  const result = requestPasswordResetSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email } = result.data;

  const adminClient = createAdminClient();

  // Generate a recovery link via the service-role admin API.
  // This does NOT send an email through Supabase — we fire our own branded email.
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (!error && data?.properties?.hashed_token) {
    // Build the confirm URL: our route handler verifies the OTP and then
    // redirects to /reset-password with an active recovery session.
    const resetUrl = `${siteUrl()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=${encodeURIComponent('/reset-password')}`;

    // Fire the branded Resend email (non-throwing helper).
    await sendPasswordResetEmail({ to: email, resetUrl });

    // Audit — intentionally omits resetUrl and hashed_token from the payload.
    await audit('auth.password_reset_request', 'auth', email, {
      email,
      found: true,
    });
  } else {
    // Swallow the error to prevent user enumeration.
    await audit('auth.password_reset_request', 'auth', email, {
      email,
      found: false,
    });
  }

  // Always return identical generic success so the response cannot reveal
  // whether the email address exists in the system.
  return { ok: true };
}
