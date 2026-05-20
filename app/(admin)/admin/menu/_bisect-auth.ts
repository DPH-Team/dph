'use server';

/**
 * DIAGNOSTIC — remove once root import is identified.
 *
 * Tests whether importing from lib/auth breaks server action registration.
 * requireStaff imports 'server-only' and calls next/headers.
 */
import { requireStaff } from '@/lib/auth';

export async function bisectAuthAction(_prev: unknown, _formData: FormData) {
  void requireStaff;
  return { ok: true, message: 'auth import ok' } as const;
}
