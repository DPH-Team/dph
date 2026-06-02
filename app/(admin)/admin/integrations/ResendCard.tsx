'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Mail, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ActionState } from '@/lib/types/action-state';
import type { TestActionState } from './actions';
import {
  saveCredentialsAction,
  saveResendConfigAction,
  updateResendEnabledAction,
  testConnectionAction,
} from './actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days}d ago`;
}

// ─── View type ────────────────────────────────────────────────────────────────

export interface ResendCardProps {
  enabled: boolean;
  hasCredentials: boolean;
  fromEmail: string;
  replyTo: string;
  lastTestStatus: string | null;
  lastTestedAt: Date | null;
  lastTestError: string | null;
}

// ─── Test status badge ────────────────────────────────────────────────────────

function TestStatusBadge({
  status,
  testedAt,
  error,
}: {
  status: string | null;
  testedAt: Date | null;
  error: string | null;
}) {
  if (!status || !testedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Plug className="size-3.5" aria-hidden="true" />
        Never tested
      </span>
    );
  }

  const relative = relativeTime(testedAt);
  const isSuccess = status === 'success';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        isSuccess ? 'text-emerald-400' : 'text-destructive',
      )}
    >
      {isSuccess ? (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      ) : (
        <XCircle className="size-3.5" aria-hidden="true" />
      )}
      {isSuccess
        ? `Last tested ${relative}`
        : `Failed ${relative}${error ? ` — ${error}` : ''}`}
    </span>
  );
}

// ─── Credentials sub-form ─────────────────────────────────────────────────────

function ResendCredentialsForm({
  hasExistingCreds,
}: {
  hasExistingCreds: boolean;
}) {
  const router = useRouter();
  const boundAction = saveCredentialsAction.bind(null, 'resend');
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    boundAction,
    null,
  );
  const prevRef = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
      toast.success('Resend API key saved.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const errors =
    state && !state.ok
      ? ((state.fieldErrors ?? {}) as Record<string, string[]>)
      : {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="resend-api_key"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          API Key
        </label>
        <Input
          id="resend-api_key"
          name="api_key"
          type="password"
          maxLength={200}
          autoComplete="off"
          placeholder={
            hasExistingCreds
              ? `${'•'.repeat(8)} (set — leave blank to keep)`
              : 're_xxxxxxxxxxxxxxxxxxxxxxxx'
          }
          aria-describedby={
            errors.api_key?.length ? 'resend-api_key-error' : undefined
          }
        />
        {errors.api_key?.length ? (
          <p
            id="resend-api_key-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {errors.api_key[0]}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Generate an API key in your{' '}
          <a
            href="https://resend.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Resend dashboard
          </a>
          . Keys start with{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
            re_
          </code>
          .
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && (
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
          )}
          {isPending ? 'Saving…' : 'Save API key'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {hasExistingCreds
            ? 'Leave blank to keep existing key.'
            : 'Key is encrypted at rest.'}
        </p>
      </div>

      {state && !state.ok && state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

// ─── Config sub-form ──────────────────────────────────────────────────────────

function ResendConfigForm({
  fromEmail,
  replyTo,
}: {
  fromEmail: string;
  replyTo: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionState | null,
    FormData
  >(saveResendConfigAction, null);
  const prevRef = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Resend config saved.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fieldErrors =
    state && !state.ok
      ? ((state.fieldErrors ?? {}) as Record<string, string[]>)
      : {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* From email */}
        <div className="space-y-1.5">
          <label
            htmlFor="resend-from_email"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            From address
          </label>
          <Input
            id="resend-from_email"
            name="from_email"
            type="text"
            maxLength={320}
            autoComplete="off"
            defaultValue={fromEmail}
            placeholder="District Pour Haus <hello@districtpourhaus.com>"
            aria-describedby={
              fieldErrors.from_email?.length
                ? 'resend-from_email-error'
                : undefined
            }
          />
          {fieldErrors.from_email?.length ? (
            <p
              id="resend-from_email-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.from_email[0]}
            </p>
          ) : null}
        </div>

        {/* Reply-to */}
        <div className="space-y-1.5">
          <label
            htmlFor="resend-reply_to"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Reply-to address
          </label>
          <Input
            id="resend-reply_to"
            name="reply_to"
            type="text"
            maxLength={320}
            autoComplete="off"
            defaultValue={replyTo}
            placeholder="info@districtpourhaus.com"
            aria-describedby={
              fieldErrors.reply_to?.length
                ? 'resend-reply_to-error'
                : undefined
            }
          />
          {fieldErrors.reply_to?.length ? (
            <p
              id="resend-reply_to-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.reply_to[0]}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Replies from customers will be routed here. If blank, defaults to
            the from address.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && (
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
          )}
          {isPending ? 'Saving…' : 'Save config'}
        </Button>
        <p className="text-xs text-muted-foreground">
          These addresses appear in outbound email headers — they are not secret.
        </p>
      </div>

      {state && !state.ok && state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

// ─── Enabled toggle sub-form ──────────────────────────────────────────────────

function ResendEnabledForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionState | null,
    FormData
  >(updateResendEnabledAction, null);
  const prevRef = useRef<ActionState | null>(null);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Resend settings saved.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input
        type="hidden"
        name="enabled"
        value={localEnabled ? 'true' : 'false'}
      />

      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={localEnabled}
          onClick={() => setLocalEnabled((prev: boolean) => !prev)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            localEnabled ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform',
              localEnabled ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
        <span className="text-sm text-foreground">
          {localEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </label>

      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending && (
          <Loader2 className="size-4 animate-spin mr-1" aria-hidden="true" />
        )}
        {isPending ? 'Saving…' : 'Save settings'}
      </Button>

      {state && !state.ok && state.error && (
        <p role="alert" className="text-xs text-destructive w-full">
          {state.error}
        </p>
      )}
    </form>
  );
}

// ─── Test-connection button ───────────────────────────────────────────────────

function ResendTestConnectionButton({
  hasExistingCreds,
}: {
  hasExistingCreds: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [lastResult, setLastResult] = useState<TestActionState | null>(null);

  async function handleTest() {
    setIsPending(true);
    try {
      const result = await testConnectionAction('resend');
      setLastResult(result);
      router.refresh();
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setLastResult({ ok: false, error: msg });
      router.refresh();
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending || !hasExistingCreds}
        onClick={handleTest}
        title={
          !hasExistingCreds ? 'Save API key before testing' : undefined
        }
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
            Testing…
          </>
        ) : (
          'Test connection'
        )}
      </Button>

      {!hasExistingCreds && (
        <span className="text-xs text-muted-foreground">
          Save API key first to enable testing.
        </span>
      )}

      {lastResult && (
        <span
          className={cn(
            'text-xs',
            lastResult.ok ? 'text-emerald-400' : 'text-destructive',
          )}
          role="status"
        >
          {lastResult.ok ? (
            <>
              <CheckCircle2 className="inline size-3.5 mr-1" aria-hidden="true" />
              {lastResult.message}
            </>
          ) : (
            <>
              <XCircle className="inline size-3.5 mr-1" aria-hidden="true" />
              {lastResult.error}
            </>
          )}
        </span>
      )}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ResendCard({
  enabled,
  hasCredentials,
  fromEmail,
  replyTo,
  lastTestStatus,
  lastTestedAt,
  lastTestError,
}: ResendCardProps) {
  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Mail className="size-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Resend</CardTitle>
            <CardDescription>
              Transactional email delivery for inquiry auto-replies and staff
              notifications. Requires a verified sender domain in your Resend
              dashboard before emails will deliver.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
              enabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
            )}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          {enabled && !hasCredentials && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs font-semibold text-amber-400">
              No API key set — email sending is disabled
            </span>
          )}
          {enabled && hasCredentials && (
            <TestStatusBadge
              status={lastTestStatus}
              testedAt={lastTestedAt}
              error={lastTestError}
            />
          )}
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Enabled toggle */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Settings</h3>
          <p className="text-xs text-muted-foreground">
            When enabled, the site uses the admin-configured API key and sender
            addresses. When disabled, the email layer falls back to the{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              RESEND_*
            </code>{' '}
            env vars (or silently skips sending if those are also absent).
          </p>
          <ResendEnabledForm enabled={enabled} />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* API key form */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">API key</h3>
          <ResendCredentialsForm hasExistingCreds={hasCredentials} />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Sender config form */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Sender configuration
          </h3>
          <p className="text-xs text-muted-foreground">
            The from address must be on a domain verified in your Resend
            dashboard. The reply-to address determines where customer replies
            land.
          </p>
          <ResendConfigForm fromEmail={fromEmail} replyTo={replyTo} />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Test connection */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Test connection
          </h3>
          <ResendTestConnectionButton hasExistingCreds={hasCredentials} />
        </div>
      </CardContent>
    </Card>
  );
}
