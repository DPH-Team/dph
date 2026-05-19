/**
 * lib/auth.ts — Server-only auth helpers for District Pour Haus.
 *
 * These helpers centralise session resolution and role checks so every admin
 * route and server action has a single call-site that enforces auth.
 *
 * x-pathname is set by proxy.ts on every /admin request so RSCs can read the
 * current path without access to the raw request object.
 */

import 'server-only';

import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the current Supabase Auth user or null.
 * Does not throw — callers should check for null.
 */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Returns the current user's profile row or null.
 * Joins session user with public.profiles.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;

  return {
    id: profile.id as string,
    email: profile.email as string,
    full_name: profile.full_name as string | null,
    role: profile.role as AppRole,
  };
}

/**
 * Resolves the current request pathname.
 * Reads x-pathname forwarded by proxy.ts; falls back to /admin.
 */
async function getCurrentPath(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-pathname') ?? '/admin';
  } catch {
    return '/admin';
  }
}

/**
 * Requires the caller to be an authenticated staff or admin user.
 * Redirects to /login?next=<currentPath> if not authenticated.
 * Returns the resolved UserProfile.
 */
export async function requireStaff(): Promise<UserProfile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    const path = await getCurrentPath();
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }

  return profile;
}

/**
 * Requires the caller to be an admin user.
 * Calls requireStaff() first (handles unauthenticated redirect),
 * then calls notFound() if the user's role is not 'admin'.
 * Using notFound() rather than a 403 avoids revealing that the route exists.
 */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await requireStaff();

  if (profile.role !== 'admin') {
    notFound();
  }

  return profile;
}
