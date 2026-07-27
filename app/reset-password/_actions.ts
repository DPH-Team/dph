'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resetPasswordSchema } from '@/lib/validators/users';
import { audit } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

/**
 * resetPasswordAction — sets the current user's password after a recovery flow.
 *
 * Requires an active recovery session established by /auth/confirm. If the
 * session is missing or expired the action returns an error so the UI can
 * prompt the user to request a fresh link.
 *
 * Security notes:
 *  - Password is NEVER included in the audit log payload.
 *  - Uses the session client (anon key + recovery session cookie) — not the
 *    service-role client — so the password update is scoped to the current user.
 */
export async function resetPasswordAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const result = resetPasswordSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { password } = result.data;

  // Resolve the current recovery session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: 'Your reset link has expired. Please request a new one.',
    };
  }

  // Update the password via the recovery session client.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      ok: false,
      error: error.message ?? 'Failed to update password. Please try again.',
    };
  }

  // Audit — password intentionally omitted from the payload.
  await audit('profile.password_reset_self', 'profile', user.id);

  redirect('/login?reset=success');
}
