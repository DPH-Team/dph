'use server';

/**
 * DIAGNOSTIC — remove once root import is identified.
 *
 * Tests whether importing from lib/audit breaks server action registration.
 * auditCreate imports 'server-only', lib/supabase/admin, and lib/supabase/server,
 * and calls next/headers.
 */
import { auditCreate } from '@/lib/audit';

export async function bisectAuditAction(_prev: unknown, _formData: FormData) {
  void auditCreate;
  return { ok: true, message: 'audit import ok' } as const;
}
