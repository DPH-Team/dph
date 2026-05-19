/**
 * proxy.ts — Auth guard for /admin routes.
 *
 * In Next.js 16 the file is named proxy.ts (middleware.ts is deprecated).
 * Exported function is named `proxy` (not `middleware`).
 *
 * Responsibilities:
 * 1. Refresh the Supabase session on every /admin request.
 * 2. Redirect unauthenticated visitors to /login?next=<path>.
 * 3. Forward x-pathname header so RSCs can read the current path.
 *
 * Role checks (staff vs admin) are done inside server actions and route
 * handlers via requireStaff() / requireAdmin() in lib/auth.ts — not here.
 * Proxy is the first line of defence; DAL is the authoritative gate.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  // Build a mutable response so we can carry Set-Cookie headers downstream.
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Create a Supabase SSR client wired to this request/response pair.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request (so the upstream RSC sees them)
          // and onto the response (so the browser receives them).
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser() refreshes the session token if it has expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login, preserving the target path in ?next=
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Forward the current pathname so server components can call
  // requireStaff() / requireAdmin() and embed the correct ?next= URL.
  response.headers.set('x-pathname', request.nextUrl.pathname);

  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
