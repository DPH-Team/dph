'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, type SignInState } from './_actions';

interface LoginFormProps {
  next: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Hidden next param so the action knows where to redirect */}
      <input type="hidden" name="next" value={next} />

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
          aria-describedby={
            state?.fieldErrors?.email ? 'email-error' : undefined
          }
          required
        />
        {state?.fieldErrors?.email && (
          <p id="email-error" className="text-xs text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!state?.fieldErrors?.password}
          aria-describedby={
            state?.fieldErrors?.password ? 'password-error' : undefined
          }
          required
        />
        {state?.fieldErrors?.password && (
          <p id="password-error" className="text-xs text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
        {/* Show generic error when there are no field errors */}
        {state?.error && state.fieldErrors && (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
