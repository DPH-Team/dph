'use server';

import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { changeOwnPasswordSchema } from '@/lib/validators/users';
import { audit } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

/**
 * changeOwnPasswordAction — lets the current user change their own password.
 *
 * On success:
 *  1. Updates the password via the session client (supabase.auth.updateUser).
 *  2. Clears the must_change_password flag via the service-role admin client.
 *  3. Writes an audit log entry (no password included in payload).
 *  4. Redirects to /admin.
 */
export async function changeOwnPasswordAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const result = changeOwnPasswordSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { password } = result.data;

  // 1. Update password via session client.
  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return {
      ok: false,
      error: updateError.message ?? 'Failed to update password.',
    };
  }

  // 2. Clear the must_change_password flag via service-role client.
  const adminClient = createAdminClient();
  const { error: metaError } = await adminClient.auth.admin.updateUserById(
    profile.id,
    { app_metadata: { must_change_password: false } },
  );

  if (metaError) {
    // Non-fatal — the password was changed successfully; the flag just won't clear.
    // The user will be re-prompted on next login, which is acceptable.
    console.error(
      '[account] Failed to clear must_change_password flag:',
      metaError.message,
    );
  }

  // 3. Audit (no password in payload).
  await audit('profile.password_change', 'profile', profile.id);

  redirect('/admin');
}
