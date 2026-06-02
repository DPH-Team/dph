import 'server-only';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

// ─── Verifier ─────────────────────────────────────────────────────────────────

/**
 * Verifies a Cloudflare Turnstile challenge token server-side.
 *
 * DEV FALLBACK: if TURNSTILE_SECRET_KEY is unset, the function returns true
 * and logs a warning. This matches the frontend contract — absence of the
 * secret key means verification is bypassed in local dev.
 *
 * NEVER THROWS — callers should treat a false return as a 400/reject.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string,
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      '[turnstile] TURNSTILE_SECRET_KEY is not set — skipping verification (dev fallback)',
    );
    return true;
  }

  if (!token) {
    console.warn('[turnstile] No token provided — rejecting');
    return false;
  }

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (ip) body.set('remoteip', ip);

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );

    if (!res.ok) {
      console.error('[turnstile] siteverify HTTP error:', res.status);
      return false;
    }

    const data = (await res.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      console.warn('[turnstile] Verification failed:', data['error-codes']);
    }

    return data.success;
  } catch (err) {
    console.error('[turnstile] Unexpected error during verification:', err);
    return false;
  }
}
