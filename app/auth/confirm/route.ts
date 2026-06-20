import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /auth/confirm
 *
 * Verifies a Supabase recovery OTP and redirects the user to their intended
 * destination (default: /reset-password).
 *
 * Query params:
 *   token_hash  — the hashed OTP from the generated recovery link
 *   type        — must be "recovery"
 *   next        — optional path to redirect to after verification (must start
 *                 with "/" and not with "//" to prevent open-redirect attacks)
 *
 * Flow:
 *   1. Validate required query parameters.
 *   2. Call supabase.auth.verifyOtp({ type: 'recovery', token_hash }) so the
 *      SSR cookie adapter can write the session cookies onto the response.
 *   3. On success, redirect to `next` (or /reset-password).
 *   4. On failure, redirect to /forgot-password?error=expired.
 *
 * Cookie forwarding: verifyOtp() calls the SSR cookie adapter's setAll()
 * which writes to the Next.js cookies() store. Because we are in a Route
 * Handler (not a Server Component), cookies() is writable. We build the
 * redirect response ourselves and copy any Set-Cookie headers produced by
 * verifyOtp() so the session is available on subsequent requests.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const rawNext = searchParams.get('next') ?? '/reset-password';

  // Guard: only handle recovery links.
  if (type !== 'recovery' || !tokenHash) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', origin));
  }

  // Open-redirect guard: `next` must be a relative path starting with "/" but
  // not "//" (which browsers treat as a protocol-relative URL).
  const safeNext =
    rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/reset-password';

  // Verify the OTP. The SSR client is wired to the Next.js cookies() store,
  // so a successful verifyOtp() sets the recovery session cookies.
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash,
  });

  if (error) {
    // Expired, already used, or invalid token — send back to the request form.
    return NextResponse.redirect(
      new URL('/forgot-password?error=expired', origin),
    );
  }

  // Redirect to the target page (default: /reset-password).
  // Next.js Route Handlers DO support writing cookies via the cookies() store;
  // the Set-Cookie headers are automatically included in the response produced
  // by NextResponse.redirect().
  return NextResponse.redirect(new URL(safeNext, origin));
}
