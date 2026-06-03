'use client';

import React, { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Camera } from 'lucide-react';
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
import { saveInstagramConfigAction } from './actions';

// ─── View type ────────────────────────────────────────────────────────────────

export interface InstagramCardProps {
  enabled: boolean;
  feedId: string;
}

// ─── Config + enabled form ────────────────────────────────────────────────────

function InstagramConfigForm({
  enabled,
  feedId,
}: {
  enabled: boolean;
  feedId: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    saveInstagramConfigAction,
    null,
  );
  const prevRef = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Instagram config saved.');
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
          When enabled and a Behold feed ID is set, the homepage Instagram slot
          will load live posts from your feed.
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

      {/* Behold feed ID field */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Configuration</h3>
        <div className="space-y-1.5">
          <label
            htmlFor="instagram-feed_id"
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Behold Feed ID
          </label>
          <Input
            id="instagram-feed_id"
            name="feed_id"
            type="text"
            maxLength={120}
            autoComplete="off"
            defaultValue={feedId}
            placeholder="e.g. aBcDeFgH1234"
            aria-describedby={
              fieldErrors.feed_id?.length ? 'instagram-feed_id-error' : 'instagram-feed_id-hint'
            }
          />
          {fieldErrors.feed_id?.length ? (
            <p
              id="instagram-feed_id-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.feed_id[0]}
            </p>
          ) : (
            <p id="instagram-feed_id-hint" className="text-xs text-muted-foreground">
              Create a feed at{' '}
              <a
                href="https://behold.so"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                behold.so
              </a>
              , connect your Instagram account, then paste the Feed ID here. The
              Feed ID appears in your Behold dashboard under each feed.
            </p>
          )}
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
          The feed ID is not a secret — it appears in the public feed URL.
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

// ─── Main card ────────────────────────────────────────────────────────────────

export function InstagramCard({ enabled, feedId }: InstagramCardProps) {
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
              Display your latest Instagram posts on the homepage via{' '}
              <a
                href="https://behold.so"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Behold.so
              </a>
              . No Instagram API credentials are stored here — Behold handles
              the Instagram OAuth connection securely on their platform.
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
          {enabled && !feedId && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs font-semibold text-amber-400">
              No feed ID set — Instagram slot will show placeholder posts
            </span>
          )}
          {enabled && feedId && (
            <span className="text-xs text-muted-foreground">
              Feed ID:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                {feedId}
              </code>
            </span>
          )}
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Config form (includes enabled toggle + feed ID) */}
        <InstagramConfigForm enabled={enabled} feedId={feedId} />
      </CardContent>
    </Card>
  );
}
