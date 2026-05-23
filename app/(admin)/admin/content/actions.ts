'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { updateContentBlock } from '@/lib/db/queries/content-blocks';
import { CONTENT_BLOCK_KEYS, CONTENT_BLOCK_SCHEMAS } from '@/lib/validators/content-blocks';
import type { ContentBlockKey } from '@/lib/validators/content-blocks';
import type { ActionState } from '@/lib/types/action-state';

/**
 * Update a single content block by key.
 *
 * Both admin and staff roles are permitted — requireStaff() accepts both.
 * Validation is performed here via the per-key Zod schema, and then again
 * inside updateContentBlock() before the upsert. The audit log entry is
 * written by updateContentBlock() itself.
 */
export async function updateContentBlockAction(
  key: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  // Guard: unknown key
  if (!(CONTENT_BLOCK_KEYS as readonly string[]).includes(key)) {
    return { ok: false, error: 'Unknown content block key.' };
  }

  const typedKey = key as ContentBlockKey;
  const schema = CONTENT_BLOCK_SCHEMAS[typedKey];

  // Extract the raw JSON value from FormData.
  // The form serialises the entire block value as a single JSON string
  // under the field name "value".
  const rawJson = formData.get('value');
  if (typeof rawJson !== 'string' || !rawJson) {
    return { ok: false, error: 'No value submitted.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'Could not parse submitted value as JSON.' };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    // Flatten errors into a fieldErrors map keyed by dot-notation paths.
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const dotPath = issue.path.join('.');
      const key2 = dotPath || '_root';
      if (!fieldErrors[key2]) {
        fieldErrors[key2] = [];
      }
      fieldErrors[key2].push(issue.message);
    }
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors,
    };
  }

  try {
    await updateContentBlock(typedKey, result.data, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to save content block: ${msg}` };
  }

  // Revalidate the public cache for this content block.
  revalidateTag(`content:${key}`, 'max');

  // Also revalidate the public page(s) that consume this block.
  if (key === 'home_hero' || key === 'home_callouts') {
    revalidatePath('/');
  } else if (key === 'about_body') {
    revalidatePath('/about');
  }

  revalidatePath('/admin/content');
  revalidatePath(`/admin/content/${key}`);

  return { ok: true };
}
