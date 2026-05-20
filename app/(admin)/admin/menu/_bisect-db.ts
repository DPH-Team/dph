'use server';

/**
 * DIAGNOSTIC — remove once root import is identified.
 *
 * Tests whether importing from lib/db/queries/menu breaks server action
 * registration. listSections transitively imports lib/db/index.ts which
 * calls postgres(connectionString) at module load time.
 */
import { listSections } from '@/lib/db/queries/menu';

export async function bisectDbAction(_prev: unknown, _formData: FormData) {
  void listSections;
  return { ok: true, message: 'db import ok' } as const;
}
