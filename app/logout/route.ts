import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLogout } from '@/lib/audit';

/**
 * POST /logout
 *
 * Signs out the current session and audits the event.
 * Redirects to /login on completion.
 *
 * Audit failure policy: auditLogout() throws on insert failure, which will
 * surface as a 500. Callers should use a form POST (not client-side fetch)
 * so the browser follows the redirect naturally.
 */
export async function POST() {
  const supabase = await createClient();

  // Audit before signing out so we can still read the session.
  // If the audit throws we do NOT sign out (security gap avoided).
  await auditLogout();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'), {
    status: 303,
  });
}
