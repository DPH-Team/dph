'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestPasswordResetAction } from './_actions';

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    undefined,
  );

  if (state?.ok === true) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a reset link is on its way. The
          link expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Global error */}
      {state?.error && !state.fieldErrors && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!state?.fieldErrors?.email}
          aria-describedby={state?.fieldErrors?.email ? 'email-error' : undefined}
          required
        />
        {state?.fieldErrors?.email && (
          <p id="email-error" role="alert" className="text-xs text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full gap-2" size="lg">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Send reset link
      </Button>
    </form>
  );
}
