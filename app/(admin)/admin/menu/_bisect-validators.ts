'use server';

/**
 * DIAGNOSTIC — remove once root import is identified.
 *
 * Tests whether importing from lib/validators/menu breaks server action
 * registration. createMenuSectionSchema only depends on zod.
 */
import { createMenuSectionSchema } from '@/lib/validators/menu';

export async function bisectValidatorsAction(
  _prev: unknown,
  _formData: FormData,
) {
  void createMenuSectionSchema;
  return { ok: true, message: 'validators import ok' } as const;
}
