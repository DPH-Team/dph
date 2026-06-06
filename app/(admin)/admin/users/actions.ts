'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import {
  createUserSchema,
  updateRoleSchema,
  setStatusSchema,
} from '@/lib/validators/users';
import { auditCreate, auditUpdate, audit } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

// ─── Ban duration constants ────────────────────────────────────────────────────

/** ~100 years — effectively permanent. */
const BAN_DURATION_PERMANENT = '876000h';
const BAN_DURATION_NONE = 'none';

// ─── Revalidation helper ──────────────────────────────────────────────────────

function revalidateUsers() {
  revalidatePath('/admin/users');
}

// ─── Create user ──────────────────────────────────────────────────────────────

/**
 * Create a new auth user + profile row.
 *
 * The Supabase trigger handle_new_auth_user creates the profile row; we then
 * update it to set role and fullName (the trigger defaults to role = 'staff').
 * We set app_metadata.must_change_password = true so the admin layout redirects
 * the user to the password-change page on first login.
 *
 * Password is NEVER included in the audit log payload.
 */
export async function createUserAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName') || undefined,
    role: formData.get('role'),
  };

  const result = createUserSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password, fullName, role } = result.data;

  const adminClient = createAdminClient();

  // Create the auth user (email_confirm: true skips the confirmation email).
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? null },
      app_metadata: { must_change_password: true },
    });

  if (authError || !authData.user) {
    // Surface "email already exists" as a field error so the form can highlight.
    if (authError?.message?.toLowerCase().includes('already')) {
      return {
        ok: false,
        error: 'A user with that email already exists.',
        fieldErrors: { email: ['Email is already in use.'] },
      };
    }
    return {
      ok: false,
      error: authError?.message ?? 'Failed to create user.',
    };
  }

  const userId = authData.user.id;

  // The trigger has created the profile row; now update it with role + fullName.
  // We use the service-role DB client (Drizzle) so the prevent_self_role_promotion
  // trigger's early-return path (auth.uid() IS NULL) allows the update.
  try {
    await db
      .update(profiles)
      .set({
        role,
        fullName: fullName ?? null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, userId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // The auth user was created; return a partial-success error so the admin
    // knows to fix the role manually rather than retrying from scratch.
    console.error('[users] Profile update failed after auth user creation:', {
      userId,
      error: msg,
    });
    return {
      ok: false,
      error: `User created but profile update failed: ${msg}. Please edit the user's role manually.`,
    };
  }

  // Audit — never log the password.
  await auditCreate('profile', userId, {
    email,
    role,
    full_name: fullName ?? null,
  });

  revalidateUsers();

  redirect('/admin/users');
}

// ─── Update role ──────────────────────────────────────────────────────────────

/**
 * Update a user's role.
 *
 * Guards:
 *  - Admin cannot demote themselves (self-lockout prevention).
 *  - Cannot demote the last remaining admin to staff.
 */
export async function updateUserRoleAction(
  id: string,
  newRole: string,
): Promise<ActionState> {
  const actor = await requireAdmin();

  const result = updateRoleSchema.safeParse({ role: newRole });
  if (!result.success) {
    return { ok: false, error: 'Invalid role value.' };
  }

  const role = result.data.role;

  // Guard: cannot change own role.
  if (id === actor.id) {
    return {
      ok: false,
      error: 'You cannot change your own role.',
    };
  }

  // Guard: cannot demote last admin.
  if (role === 'staff') {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(profiles)
      .where(eq(profiles.role, 'admin'));

    if ((adminCount ?? 0) <= 1) {
      return {
        ok: false,
        error:
          'Cannot remove the last admin account. Promote another user to admin first.',
      };
    }
  }

  // Fetch before state for audit diff.
  const beforeRows = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  if (!beforeRows[0]) {
    return { ok: false, error: 'User not found.' };
  }

  const beforeRole = beforeRows[0].role;

  await db
    .update(profiles)
    .set({ role, updatedAt: new Date() })
    .where(eq(profiles.id, id));

  await auditUpdate('profile', id, { role: beforeRole }, { role });

  revalidateUsers();

  return { ok: true };
}

// ─── Set user status (ban / unban) ────────────────────────────────────────────

/**
 * Disable or re-enable a user account.
 *
 * Guards:
 *  - Cannot disable yourself.
 *  - Cannot disable the last remaining active admin.
 */
export async function setUserStatusAction(
  id: string,
  action: string,
): Promise<ActionState> {
  const actor = await requireAdmin();

  const result = setStatusSchema.safeParse({ action });
  if (!result.success) {
    return { ok: false, error: 'Invalid action value.' };
  }

  const statusAction = result.data.action;

  // Guard: cannot disable yourself.
  if (statusAction === 'disable' && id === actor.id) {
    return {
      ok: false,
      error: 'You cannot disable your own account.',
    };
  }

  // Guard: cannot disable the last active admin.
  if (statusAction === 'disable') {
    const targetRows = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);

    if (targetRows[0]?.role === 'admin') {
      // Count active admins requires auth data — use a conservative check:
      // if there is only one admin profile, block.
      const [{ value: adminCount }] = await db
        .select({ value: count() })
        .from(profiles)
        .where(eq(profiles.role, 'admin'));

      if ((adminCount ?? 0) <= 1) {
        return {
          ok: false,
          error:
            'Cannot disable the last admin account. Promote another user to admin first.',
        };
      }
    }
  }

  // Fetch email for the audit payload.
  const targetRows = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  const email = targetRows[0]?.email ?? id;

  const adminClient = createAdminClient();

  const { error: banError } = await adminClient.auth.admin.updateUserById(id, {
    ban_duration:
      statusAction === 'disable' ? BAN_DURATION_PERMANENT : BAN_DURATION_NONE,
  });

  if (banError) {
    return {
      ok: false,
      error: banError.message ?? 'Failed to update user status.',
    };
  }

  await audit(
    statusAction === 'disable' ? 'profile.disable' : 'profile.enable',
    'profile',
    id,
    { email },
  );

  revalidateUsers();

  return { ok: true };
}
