'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Plug,
  Beer,
  ShoppingBag,
} from 'lucide-react';
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
import type { Integration } from '@/lib/db/schema';
import type { ActionState } from '@/lib/types/action-state';
import type { IntegrationName } from '@/lib/validators/integrations';
import type { TestActionState } from './actions';

// View of an Integration safe to cross the RSC boundary: drops `credentials`
// (bytea / Uint8Array — not serializable to a Client Component) and replaces
// it with a derived boolean computed server-side.
export type IntegrationView = Omit<Integration, 'credentials'> & {
  hasCredentials: boolean;
};
import {
  saveCredentialsAction,
  updateTogglesAction,
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function IntegrationIcon({
  name,
  className,
}: {
  name: IntegrationName;
  className?: string;
}) {
  if (name === 'untappd') {
    return <Beer className={cn('size-5', className)} aria-hidden="true" />;
  }
  return (
    <ShoppingBag className={cn('size-5', className)} aria-hidden="true" />
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

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
        ? `Last tested ${relativeTime(testedAt)}`
        : `Failed ${relativeTime(testedAt)}${error ? ` — ${error}` : ''}`}
    </span>
  );
}

// ─── Credential field config ──────────────────────────────────────────────────

interface FieldConfig {
  name: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password';
  maxLength: number;
}

const UNTAPPD_FIELDS: FieldConfig[] = [
  {
    name: 'email',
    label: 'Account Email',
    placeholder: 'The email you log into Untappd for Business with',
    type: 'text',
    maxLength: 120,
  },
  {
    name: 'location_id',
    label: 'Location ID',
    placeholder: 'e.g. 12345 (Settings & Integrations > Location Settings)',
    type: 'text',
    maxLength: 50,
  },
  {
    name: 'read_write_token',
    label: 'Read & Write Token',
    placeholder: 'Read & Write API token (business.untappd.com/account)',
    type: 'password',
    maxLength: 200,
  },
];

const PRINTIFY_FIELDS: FieldConfig[] = [
  {
    name: 'api_key',
    label: 'API Key',
    placeholder: 'Printify personal access token',
    type: 'password',
    maxLength: 200,
  },
  {
    name: 'shop_id',
    label: 'Shop ID',
    placeholder: 'e.g. 9876543',
    type: 'text',
    maxLength: 50,
  },
];

function getFields(name: IntegrationName): FieldConfig[] {
  return name === 'untappd' ? UNTAPPD_FIELDS : PRINTIFY_FIELDS;
}

// ─── Sub-forms ────────────────────────────────────────────────────────────────

/**
 * Credentials sub-form. Empty submission = keep existing (no DB call).
 * Deliberately uses useActionState so pending state is reflected in the
 * submit button without any extra state.
 */
function CredentialsForm({
  name,
  hasExistingCreds,
  fieldErrors,
}: {
  name: IntegrationName;
  hasExistingCreds: boolean;
  fieldErrors?: Record<string, string[]>;
}) {
  const router = useRouter();
  const boundAction = saveCredentialsAction.bind(null, name);
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
      toast.success('Credentials saved.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fields = getFields(name);
  const errors =
    state && !state.ok
      ? ((state.fieldErrors ?? {}) as Record<string, string[]>)
      : fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label
              htmlFor={`${name}-${field.name}`}
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              {field.label}
            </label>
            <Input
              id={`${name}-${field.name}`}
              name={field.name}
              type={field.type}
              maxLength={field.maxLength}
              autoComplete="off"
              placeholder={
                hasExistingCreds
                  ? `${'•'.repeat(8)} (set — leave blank to keep)`
                  : field.placeholder
              }
              aria-describedby={
                errors[field.name]?.length
                  ? `${name}-${field.name}-error`
                  : undefined
              }
            />
            {errors[field.name]?.length ? (
              <p
                id={`${name}-${field.name}-error`}
                role="alert"
                className="text-xs text-destructive"
              >
                {errors[field.name][0]}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && (
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
          )}
          {isPending ? 'Saving…' : 'Save credentials'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {hasExistingCreds
            ? 'Leave fields blank to keep existing credentials.'
            : 'Credentials are encrypted at rest.'}
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

/**
 * Mode + enabled toggles form.
 * Uses a native select for mode and a hidden input pattern for the boolean.
 */
function TogglesForm({
  name,
  enabled,
  mode,
}: {
  name: IntegrationName;
  enabled: boolean;
  mode: string;
}) {
  const router = useRouter();
  const boundAction = updateTogglesAction.bind(null, name);
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    boundAction,
    null,
  );
  const prevRef = useRef<ActionState | null>(null);
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localMode, setLocalMode] = useState(mode);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Settings saved.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      {/* Hidden enabled value — mirrors the toggle */}
      <input type="hidden" name="enabled" value={localEnabled ? 'true' : 'false'} />

      {/* Enabled toggle */}
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

      {/* Mode select */}
      <div className="flex items-center gap-2">
        <label
          htmlFor={`${name}-mode`}
          className="text-sm text-muted-foreground"
        >
          Mode
        </label>
        <select
          id={`${name}-mode`}
          name="mode"
          value={localMode}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalMode(e.target.value)}
          className="h-8 rounded-[var(--radius-md)] border border-border bg-input px-2 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        >
          <option value="mock">Mock</option>
          <option value="live">Live</option>
        </select>
      </div>

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

/**
 * Test-connection button. Disabled until credentials have been saved at least
 * once. Shows the most recent result inline.
 */
function TestConnectionButton({
  name,
  hasExistingCreds,
}: {
  name: IntegrationName;
  hasExistingCreds: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [lastResult, setLastResult] = useState<TestActionState | null>(null);

  async function handleTest() {
    setIsPending(true);
    try {
      const result = await testConnectionAction(name);
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
          !hasExistingCreds
            ? 'Save credentials before testing'
            : undefined
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
          Save credentials first to enable testing.
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

export interface IntegrationCardProps {
  integration: IntegrationView;
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const name = integration.name as IntegrationName;
  const hasCreds = integration.hasCredentials;
  const testedAt = integration.lastTestedAt
    ? new Date(integration.lastTestedAt)
    : null;

  const displayName = name === 'untappd' ? 'Untappd' : 'Printify';
  const description =
    name === 'untappd'
      ? 'Tap list sync and events feed. Requires location ID and read/write token.'
      : 'Merch grid powered by Printify Pop-Up Store. Requires API key and shop ID.';

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <IntegrationIcon name={name} className="text-primary" />
          </span>
          <div>
            <CardTitle>{displayName}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
              integration.enabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
            )}
          >
            {integration.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
              integration.mode === 'live'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
            )}
          >
            {integration.mode === 'live' ? 'Live' : 'Mock'}
          </span>
          <TestStatusBadge
            status={integration.lastTestStatus}
            testedAt={testedAt}
            error={integration.lastTestError}
          />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Mode + enabled form */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Settings</h3>
          <p className="text-xs text-muted-foreground">
            Switching to{' '}
            <span className="font-medium text-amber-400">live</span> mode sends
            real API traffic and updates the public site away from mock fixtures.
          </p>
          <TogglesForm
            name={name}
            enabled={integration.enabled}
            mode={integration.mode}
          />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Credentials form */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Credentials</h3>
          <CredentialsForm name={name} hasExistingCreds={hasCreds} />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Test connection */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Test connection
          </h3>
          <TestConnectionButton name={name} hasExistingCreds={hasCreds} />
        </div>
      </CardContent>
    </Card>
  );
}
