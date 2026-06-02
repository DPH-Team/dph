'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, BarChart2 } from 'lucide-react';
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
import {
  savePlausibleConfigAction,
  updatePlausibleEnabledAction,
} from './actions';

// ─── View type ────────────────────────────────────────────────────────────────

export interface PlausibleCardProps {
  enabled: boolean;
  domain: string;
  host: string;
}

// ─── Config sub-form ──────────────────────────────────────────────────────────

function PlausibleConfigForm({
  domain,
  host,
}: {
  domain: string;
  host: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionState | null,
    FormData
  >(savePlausibleConfigAction, null);
  const prevRef = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Plausible config saved.');
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
        {/* Domain */}
        <div className="space-y-1.5">
          <label
            htmlFor="plausible-domain"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Domain
          </label>
          <Input
            id="plausible-domain"
            name="domain"
            type="text"
            maxLength={253}
            autoComplete="off"
            defaultValue={domain}
            placeholder="staging.districtpourhaus.com"
            aria-describedby={
              fieldErrors.domain?.length ? 'plausible-domain-error' : undefined
            }
          />
          {fieldErrors.domain?.length ? (
            <p
              id="plausible-domain-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.domain[0]}
            </p>
          ) : null}
        </div>

        {/* Script host */}
        <div className="space-y-1.5">
          <label
            htmlFor="plausible-host"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Script host
          </label>
          <Input
            id="plausible-host"
            name="host"
            type="text"
            maxLength={200}
            autoComplete="off"
            defaultValue={host || 'https://plausible.io'}
            placeholder="https://plausible.io"
            aria-describedby={
              fieldErrors.host?.length ? 'plausible-host-error' : undefined
            }
          />
          {fieldErrors.host?.length ? (
            <p
              id="plausible-host-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.host[0]}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Leave as{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              https://plausible.io
            </code>{' '}
            unless self-hosting.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && (
            <Loader2
              className="size-4 animate-spin mr-1.5"
              aria-hidden="true"
            />
          )}
          {isPending ? 'Saving…' : 'Save config'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Domain and host are not secrets — they appear in the public script
          tag.
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

function PlausibleEnabledForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionState | null,
    FormData
  >(updatePlausibleEnabledAction, null);
  const prevRef = useRef<ActionState | null>(null);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Plausible settings saved.');
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

// ─── Main card ────────────────────────────────────────────────────────────────

export function PlausibleCard({ enabled, domain, host }: PlausibleCardProps) {
  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <BarChart2
              className="size-5 text-primary"
              aria-hidden="true"
            />
          </span>
          <div>
            <CardTitle>Plausible Analytics</CardTitle>
            <CardDescription>
              Privacy-friendly, cookieless page-view analytics. No cookie
              banner required. Script is injected only on public pages when
              enabled and a domain is set.
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
          {enabled && !domain && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs font-semibold text-amber-400">
              No domain set — script will not be injected
            </span>
          )}
          {enabled && domain && (
            <span className="text-xs text-muted-foreground">
              Tracking:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                {domain}
              </code>
            </span>
          )}
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Enabled toggle */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Settings</h3>
          <p className="text-xs text-muted-foreground">
            Enabling injects the Plausible script on all public pages. The
            script is never loaded on admin or login routes.
          </p>
          <PlausibleEnabledForm enabled={enabled} />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Config form */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Configuration
          </h3>
          <PlausibleConfigForm domain={domain} host={host} />
        </div>
      </CardContent>
    </Card>
  );
}
