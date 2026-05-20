'use server';

/**
 * DIAGNOSTIC — remove once bug is identified.
 *
 * Minimal server action with no dependencies beyond FormData.
 * Used in /admin/menu/sections/new-direct to isolate whether the
 * 'use server' transformation itself works for this route group,
 * independent of the imports in actions.ts.
 *
 * Expected outcomes when hit from the diagnostic page:
 *   - This action 404s → H2 confirmed: the route group or middleware
 *     is preventing ANY action from being registered here.
 *   - This action succeeds → H2 cleared; the issue is inside actions.ts
 *     (its imports, the listSections re-export, or the prop-threading chain).
 */
export async function pingAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; name: string }> {
  const name = formData.get('name');
  console.log('[pingAction] ran — name=', name);
  return { ok: true, name: typeof name === 'string' ? name : '(empty)' };
}
