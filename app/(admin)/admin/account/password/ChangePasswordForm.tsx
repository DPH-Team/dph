'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionState } from '@/lib/types/action-state';

// ─── Field error helper ───────────────────────────────────────────────────────

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p role="alert" className="text-xs text-destructive mt-1">
      {messages[0]}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChangePasswordFormProps {
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  userEmail: string;
}

export function ChangePasswordForm({
  action,
  userEmail,
}: ChangePasswordFormProps) {
  const passwordId = useId();
  const confirmId = useId();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [serverState, formAction, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(action, undefined);

  useEffect(() => {
    if (!serverState) return;
    if (!serverState.ok) {
      toast.error(serverState.error ?? 'Something went wrong.');
    }
    // On success the server action redirects — no toast needed here.
  }, [serverState]);

  const fieldErrors =
    serverState && !serverState.ok ? serverState.fieldErrors : undefined;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-6">
      {/* Account indicator */}
      <div className="mb-6 flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-[oklch(0.235_0.004_286)] px-3 py-2">
        <KeyRound className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">
          Setting password for{' '}
          <span className="font-mono text-foreground">{userEmail}</span>
        </span>
      </div>

      <form action={formAction} noValidate className="space-y-6">
        <div className="space-y-1.5">
          <Label
            htmlFor={passwordId}
            className="after:content-['*'] after:ml-0.5 after:text-destructive"
          >
            New password
          </Label>
          <p className="text-xs text-muted-foreground">Min. 10 characters.</p>
          <div className="relative">
            <Input
              id={passwordId}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors?.password)}
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
          <FieldError messages={fieldErrors?.password} />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={confirmId}
            className="after:content-['*'] after:ml-0.5 after:text-destructive"
          >
            Confirm new password
          </Label>
          <div className="relative">
            <Input
              id={confirmId}
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors?.confirmPassword)}
              className="pr-10"
            />
            <button
              type="button"
              aria-label={
                showConfirm ? 'Hide confirm password' : 'Show confirm password'
              }
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
          <FieldError messages={fieldErrors?.confirmPassword} />
        </div>

        <Button type="submit" disabled={isPending} className="w-full gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Set new password
        </Button>
      </form>
    </div>
  );
}
