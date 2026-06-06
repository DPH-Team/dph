/**
 * lib/db/queries/users.ts — Merged user view for the admin Users section.
 *
 * Combines:
 *  - profiles table (role, fullName, createdAt) — source of truth for role/name.
 *  - Supabase auth admin listUsers() (banned_until, last_sign_in_at) — source of
 *    truth for status and last login.
 *
 * Merged by id into a UserViewModel that the admin UI consumes.
 */

import 'server-only';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppRole } from '@/lib/auth';

// ─── View model ───────────────────────────────────────────────────────────────

export interface UserViewModel {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  /** 'disabled' when banned_until is in the future. */
  status: 'active' | 'disabled';
  lastSignInAt: Date | null;
  createdAt: Date;
  /** True when this row represents the currently-authenticated user. */
  isSelf: boolean;
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Returns the merged user list.
 * @param currentUserId The id of the currently-authenticated admin.
 */
export async function listUsers(currentUserId: string): Promise<UserViewModel[]> {
  // 1. Load all profiles from the DB.
  const profileRows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      role: profiles.role,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .orderBy(profiles.createdAt);

  // 2. Load auth user data via service-role admin API.
  //    listUsers() is paginated — fetch up to 1000 which is the max per page.
  const adminClient = createAdminClient();
  const { data: authData, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    // Auth data is supplementary; if it fails, return profiles with defaults.
    console.error('[users] Failed to load auth user data:', error.message);
    return profileRows.map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.fullName ?? null,
      role: p.role as AppRole,
      status: 'active' as const,
      lastSignInAt: null,
      createdAt: new Date(p.createdAt),
      isSelf: p.id === currentUserId,
    }));
  }

  // 3. Index auth users by id for O(1) merge.
  const authById = new Map(authData.users.map((u) => [u.id, u]));

  // 4. Merge.
  return profileRows.map((p) => {
    const authUser = authById.get(p.id);

    const bannedUntil = authUser?.banned_until
      ? new Date(authUser.banned_until)
      : null;
    const isDisabled =
      bannedUntil !== null && bannedUntil > new Date();

    return {
      id: p.id,
      email: p.email,
      fullName: p.fullName ?? null,
      role: p.role as AppRole,
      status: isDisabled ? 'disabled' : 'active',
      lastSignInAt: authUser?.last_sign_in_at
        ? new Date(authUser.last_sign_in_at)
        : null,
      createdAt: new Date(p.createdAt),
      isSelf: p.id === currentUserId,
    };
  });
}

// ─── Count helpers ────────────────────────────────────────────────────────────

export interface UserCounts {
  admins: number;
  staff: number;
  disabled: number;
  total: number;
}

export function computeUserCounts(users: UserViewModel[]): UserCounts {
  let admins = 0;
  let staff = 0;
  let disabled = 0;

  for (const u of users) {
    if (u.status === 'disabled') {
      disabled++;
    } else if (u.role === 'admin') {
      admins++;
    } else {
      staff++;
    }
  }

  return { admins, staff, disabled, total: users.length };
}
