'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionState } from '@/lib/types/action-state';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHARSET =
  'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';

function generatePassword(length = 16): string {
  const chars = Array.from({ length }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)],
  );
  return chars.join('');
}

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

interface CreateUserFormProps {
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

export function CreateUserForm({ action }: CreateUserFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const fullNameId = useId();
  const roleId = useId();

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

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

  function handleGenerate() {
    setPassword(generatePassword());
  }

  return (
    <form action={formAction} noValidate className="space-y-8">
      {/* Account details */}
      <fieldset className="space-y-4">
        <legend className="sr-only">Account details</legend>
        <div className="border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-foreground">
            Account details
          </h2>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={emailId}
            className="after:content-['*'] after:ml-0.5 after:text-destructive"
          >
            Email address
          </Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="off"
            placeholder="staff@example.com"
            aria-invalid={Boolean(fieldErrors?.email)}
          />
          <FieldError messages={fieldErrors?.email} />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={passwordId}
            className="after:content-['*'] after:ml-0.5 after:text-destructive"
          >
            Temporary password
          </Label>
          <p className="text-xs text-muted-foreground">
            Min. 10 characters. The user will be required to change this on
            first login.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Generate a random password"
              onClick={handleGenerate}
              title="Generate random password"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <FieldError messages={fieldErrors?.password} />
        </div>
      </fieldset>

      {/* Profile */}
      <fieldset className="space-y-4">
        <legend className="sr-only">Profile</legend>
        <div className="border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={fullNameId}>Full name</Label>
          <p className="text-xs text-muted-foreground">
            Optional. Shown in the admin top bar and activity log.
          </p>
          <Input
            id={fullNameId}
            name="fullName"
            type="text"
            autoComplete="off"
            placeholder="e.g. Jordan Smith"
            maxLength={120}
            aria-invalid={Boolean(fieldErrors?.fullName)}
          />
          <FieldError messages={fieldErrors?.fullName} />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={roleId}
            className="after:content-['*'] after:ml-0.5 after:text-destructive"
          >
            Role
          </Label>
          <p className="text-xs text-muted-foreground">
            Admins have full access. Staff can edit content but cannot manage
            users, integrations, or the newsletter.
          </p>
          <select
            id={roleId}
            name="role"
            defaultValue="staff"
            aria-invalid={Boolean(fieldErrors?.role)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <FieldError messages={fieldErrors?.role} />
        </div>
      </fieldset>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Create user
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/admin/users" />}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
