'use client';

import { useActionState, useId, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPasswordAction } from './_actions';

export function ResetPasswordForm() {
  const passwordId = useId();
  const confirmId = useId();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    undefined,
  );

  const fieldErrors =
    state && !state.ok ? state.fieldErrors : undefined;
  const globalError = state && !state.ok ? state.error : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {/* Global error (e.g. expired session) */}
      {globalError && !fieldErrors && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {globalError}
        </p>
      )}

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={passwordId}
          className="text-sm font-medium text-foreground"
        >
          New password
        </label>
        <div className="relative">
          <Input
            id={passwordId}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!fieldErrors?.password}
            aria-describedby={fieldErrors?.password ? 'password-error' : undefined}
            required
            className="pr-10"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors?.password && (
          <p id="password-error" role="alert" className="text-xs text-destructive">
            {fieldErrors.password[0]}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={confirmId}
          className="text-sm font-medium text-foreground"
        >
          Confirm new password
        </label>
        <div className="relative">
          <Input
            id={confirmId}
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!fieldErrors?.confirmPassword}
            aria-describedby={
              fieldErrors?.confirmPassword ? 'confirm-password-error' : undefined
            }
            required
            className="pr-10"
          />
          <button
            type="button"
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            {showConfirm ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors?.confirmPassword && (
          <p
            id="confirm-password-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full gap-2" size="lg">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Set new password
      </Button>
    </form>
  );
}
