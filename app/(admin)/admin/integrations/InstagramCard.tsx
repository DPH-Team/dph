'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Camera, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
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
import type { SyncActionState } from './actions';
import { saveInstagramTokenAction, refreshInstagramFeedAction } from './actions';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface InstagramCardProps {
  enabled: boolean;
  hasToken: boolean;
  tokenObtainedAt: string | null;
  tokenExpiresAt: string | null;
}

// ─── Token status helpers ─────────────────────────────────────────────────────

type TokenStatus =
  | { level: 'none' }
  | { level: 'healthy'; daysLeft: number }
  | { level: 'warning'; daysLeft: number }
  | { level: 'error'; daysLeft: number };

function getTokenStatus(
  hasToken: boolean,
  tokenExpiresAt: string | null,
): TokenStatus {
  if (!hasToken || !tokenExpiresAt) return { level: 'none' };
  const msLeft = new Date(tokenExpiresAt).getTime() - Date.now();
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  if (daysLeft > 21) return { level: 'healthy', daysLeft };
  if (daysLeft >= 7) return { level: 'warning', daysLeft };
  return { level: 'error', daysLeft };
}

function TokenStatusBadge({
  hasToken,
  tokenExpiresAt,
}: {
  hasToken: boolean;
  tokenExpiresAt: string | null;
}) {
  const status = getTokenStatus(hasToken, tokenExpiresAt);

  if (status.level === 'none') {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        Not connected
      </span>
    );
  }

  if (status.level === 'healthy') {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
        Token healthy &mdash; {status.daysLeft} days left
      </span>
    );
  }

  if (status.level === 'warning') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs font-semibold text-amber-400">
        Token expiring soon &mdash; will refresh automatically
      </span>
    );
  }

  // error level
  return (
    <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
      Token expired or expiring &mdash; paste a fresh 60-day token from the Meta dashboard
    </span>
  );
}

// ─── Config + enabled form ────────────────────────────────────────────────────

function InstagramTokenForm({
  enabled,
  hasToken,
}: {
  enabled: boolean;
  hasToken: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    saveInstagramTokenAction,
    null,
  );
  const prevRef = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
      toast.success('Instagram token saved.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fieldErrors =
    state && !state.ok
      ? ((state.fieldErrors ?? {}) as Record<string, string[]>)
      : {};

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {/* Hidden enabled value reflects local toggle state */}
      <input type="hidden" name="enabled" value={localEnabled ? 'true' : 'false'} />

      {/* Enabled toggle */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Settings</h3>
        <p className="text-xs text-muted-foreground">
          When enabled and a token is set, the homepage Instagram slot will load
          live posts directly from the Instagram Graph API.
        </p>
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
      </div>

      <hr className="border-border" />

      {/* Access token field */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Access Token</h3>
        <div className="space-y-1.5">
          <label
            htmlFor="instagram-access_token"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Instagram Access Token
          </label>
          <Input
            id="instagram-access_token"
            name="access_token"
            type="password"
            autoComplete="off"
            placeholder={
              hasToken
                ? `${'•'.repeat(8)} (set — leave blank to keep)`
                : 'Paste your long-lived access token here'
            }
            aria-describedby={
              fieldErrors.access_token?.length
                ? 'instagram-access_token-error'
                : 'instagram-access_token-hint'
            }
          />
          {fieldErrors.access_token?.length ? (
            <p
              id="instagram-access_token-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.access_token[0]}
            </p>
          ) : (
            <p id="instagram-access_token-hint" className="text-xs text-muted-foreground">
              Generate a long-lived token at{' '}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                developers.facebook.com
              </a>{' '}
              under your app &rarr; Instagram &rarr; Generate token. Tokens are
              valid for 60 days and refresh automatically via daily cron.
              {hasToken && ' Leave blank to keep the existing token.'}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && (
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
          )}
          {isPending ? 'Saving…' : 'Save token'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {hasToken
            ? 'Leave blank to keep the existing token.'
            : 'Token is encrypted at rest.'}
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

// ─── Refresh feed button ──────────────────────────────────────────────────────

/**
 * RefreshFeedButton — calls refreshInstagramFeedAction() directly (not via
 * useActionState, since there is no form). Clears the site's 10-minute cache
 * so the next public page render fetches fresh posts from the Graph API.
 */
function RefreshFeedButton({
  canRefresh,
}: {
  canRefresh: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [lastResult, setLastResult] = useState<SyncActionState | null>(null);

  async function handleRefresh() {
    setIsPending(true);
    try {
      const result = await refreshInstagramFeedAction();
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

  const disabledTitle = !canRefresh
    ? 'Enable the integration and set a token first'
    : undefined;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending || !canRefresh}
        onClick={handleRefresh}
        title={disabledTitle}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
            Refreshing&hellip;
          </>
        ) : (
          <>
            <RefreshCw className="size-4 mr-1.5" aria-hidden="true" />
            Refresh feed now
          </>
        )}
      </Button>

      {!canRefresh && (
        <span className="text-xs text-muted-foreground">
          Enable the integration and set an access token to refresh the feed.
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

export function InstagramCard({
  enabled,
  hasToken,
  tokenObtainedAt,
  tokenExpiresAt,
}: InstagramCardProps) {
  const canRefresh = enabled && hasToken;

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Camera className="size-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Instagram</CardTitle>
            <CardDescription>
              Posts load directly from the Instagram Graph API. Paste a
              long-lived 60-day access token from your Meta app dashboard
              (developers.facebook.com &rarr; your app &rarr; Instagram &rarr;
              Generate token). The token refreshes automatically via daily cron.
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

          <TokenStatusBadge hasToken={hasToken} tokenExpiresAt={tokenExpiresAt} />

          {hasToken && tokenObtainedAt && (
            <span className="text-xs text-muted-foreground">
              Token set{' '}
              {new Date(tokenObtainedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Token form (includes enabled toggle + masked access token) */}
        <InstagramTokenForm enabled={enabled} hasToken={hasToken} />

        <hr className="border-border" />

        {/* Manual feed refresh */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Cache</h3>
          <p className="text-xs text-muted-foreground">
            Posts are cached for 10 minutes. Use this button to clear the cache
            immediately and reload the latest posts from Instagram. Useful after
            publishing new content and wanting it visible on the site right away.
          </p>
          <RefreshFeedButton canRefresh={canRefresh} />
        </div>
      </CardContent>
    </Card>
  );
}
