'use client';

import React, { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Beer } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ActionState } from '@/lib/types/action-state';
import { updateTapTakeoverAction } from './actions';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TapTakeoverCardProps {
  /** Brewery names currently on tap, de-duped and sorted alphabetically. */
  breweries: string[];
  /** Currently saved featured brewery, or null/empty if no takeover active. */
  currentBrewery: string | null;
}

// ─── Config form ──────────────────────────────────────────────────────────────

function TapTakeoverForm({
  breweries,
  currentBrewery,
}: {
  breweries: string[];
  currentBrewery: string | null;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    updateTapTakeoverAction,
    null,
  );
  const prevRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Tap takeover saved.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fieldErrors =
    state && !state.ok
      ? ((state.fieldErrors ?? {}) as Record<string, string[]>)
      : {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="tap-takeover-brewery"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Featured brewery
        </label>

        {breweries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No breweries available — Untappd tap data is empty or in mock mode
            with an empty list.
          </p>
        ) : (
          <select
            id="tap-takeover-brewery"
            name="featured_brewery"
            defaultValue={currentBrewery ?? ''}
            aria-describedby={
              fieldErrors.featured_brewery?.length
                ? 'tap-takeover-brewery-error'
                : 'tap-takeover-brewery-hint'
            }
            className={cn(
              'flex h-10 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 py-2',
              'text-sm text-foreground',
              'hover:border-[oklch(0.400_0.006_80)]',
              'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35',
              'transition-colors',
            )}
          >
            <option value="">None — no takeover active</option>
            {breweries.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}

        {fieldErrors.featured_brewery?.length ? (
          <p
            id="tap-takeover-brewery-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {fieldErrors.featured_brewery[0]}
          </p>
        ) : (
          <p id="tap-takeover-brewery-hint" className="text-xs text-muted-foreground">
            Every tap from the selected brewery will show the &ldquo;Tap
            Takeover&rdquo; banner and float to the top of the public list
            immediately — no cache wait.
          </p>
        )}
      </div>

      {/* If there are no breweries we still render the hidden field so the
          form submits a clear (empty string) which is valid per tapTakeoverSchema. */}
      {breweries.length === 0 && (
        <input type="hidden" name="featured_brewery" value="" />
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={isPending || breweries.length === 0}
        >
          {isPending && (
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
          )}
          {isPending ? 'Saving…' : 'Save'}
        </Button>
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

export function TapTakeoverCard({
  breweries,
  currentBrewery,
}: TapTakeoverCardProps) {
  const isActive = Boolean(currentBrewery && currentBrewery.trim() !== '');

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Beer className="size-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Tap Takeover</CardTitle>
            <CardDescription>
              Designate a brewery currently on tap to run a featured takeover.
              Every tap from that brewery will display the Tap Takeover banner
              and sort to the top of the public list immediately — no cache wait.
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
              isActive
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-[oklch(0.235_0.004_286)] border-border text-muted-foreground',
            )}
          >
            {isActive ? 'Takeover active' : 'No takeover'}
          </span>
          {isActive && currentBrewery && (
            <span className="text-xs text-muted-foreground">
              Featured:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                {currentBrewery}
              </code>
            </span>
          )}
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* Config form */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Configuration</h3>
          <TapTakeoverForm
            breweries={breweries}
            currentBrewery={currentBrewery}
          />
        </div>
      </CardContent>
    </Card>
  );
}
