'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { auditLogin } from '@/lib/audit';

// ─── Validation schema ────────────────────────────────────────────────────────

const SignInSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }).trim(),
  password: z
    .string()
    .min(1, { message: 'Password is required.' })
    .trim(),
  next: z.string().optional(),
});

// ─── State types ──────────────────────────────────────────────────────────────

export type SignInState =
  | { error: string; fieldErrors?: { email?: string[]; password?: string[] } }
  | undefined;

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * signIn — server action for the login form.
 *
 * On success: audits the login and redirects to a validated next URL.
 * On failure: audits the attempt and returns { error } for the form to display.
 *
 * next param is validated: only /admin* paths are accepted.
 * Any other value defaults to /admin to prevent open-redirect.
 */
export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  // Validate
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  };

  const result = SignInSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    return {
      error: 'Please correct the errors below.',
      fieldErrors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    };
  }

  const { email, password } = result.data;

  // Validate the next URL — only /admin* paths accepted
  const rawNext = result.data.next ?? '';
  const safeNext =
    rawNext.startsWith('/admin') ? rawNext : '/admin';

  // Attempt sign-in
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await auditLogin(false, email, error.message);

    return {
      error: 'Invalid email or password. Please try again.',
    };
  }

  // Audit success — throws on audit error (security gap otherwise)
  await auditLogin(true, email);

  // redirect() throws internally; must be outside try/catch
  redirect(safeNext);
}
