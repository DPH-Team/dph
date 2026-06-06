'use client';

import React, { useActionState, useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarDays, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ActionState } from '@/lib/types/action-state';
import {
  createScheduledTakeoverAction,
  deleteScheduledTakeoverAction,
} from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledTakeover {
  id: string;
  brewery: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface ScheduledTakeoversCardProps {
  takeovers: ScheduledTakeover[];
  /** Current on-tap brewery names for the datalist suggestion. */
  breweries: string[];
  /** Today's YYYY-MM-DD in venue timezone. */
  today: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a YYYY-MM-DD date string for display, e.g. "Sat, Jun 14, 2026".
 * Anchors to noon to avoid any DST edge-case date flips.
 * Purely deterministic from the string — no hydration mismatch possible.
 */
function formatTakeoverDate(dateStr: string): string {
  // Anchor to noon local so DST transitions never flip the calendar date.
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

type TakeoverStatus = 'today' | 'upcoming' | 'past';

function getTakeoverStatus(dateStr: string, today: string): TakeoverStatus {
  if (dateStr === today) return 'today';
  if (dateStr > today) return 'upcoming';
  return 'past';
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TakeoverStatus }) {
  if (status === 'today') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
        Today
      </span>
    );
  }
  if (status === 'upcoming') {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-2.5 py-0.5 text-xs font-semibold text-foreground">
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      Past
    </span>
  );
}

// ─── Delete button ────────────────────────────────────────────────────────────

function DeleteTakeoverButton({
  takeover,
  today,
}: {
  takeover: ScheduledTakeover;
  today: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    deleteScheduledTakeoverAction,
    null,
  );
  const prevRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Takeover removed.');
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const status = getTakeoverStatus(takeover.date, today);
  const formattedDate = formatTakeoverDate(takeover.date);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete takeover for ${formattedDate}`}
          />
        }
      >
        <Trash2 className="size-4 text-muted-foreground hover:text-destructive" aria-hidden="true" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete takeover for {formattedDate}?
          </DialogTitle>
          <DialogDescription>
            {status === 'today'
              ? 'This takeover is active today. Deleting it will remove the scheduled brewery immediately.'
              : 'This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="id" value={takeover.id} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={isPending}>
              Cancel
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && (
                <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
              )}
              {isPending ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add form ─────────────────────────────────────────────────────────────────

function AddTakeoverForm({
  breweries,
  today,
}: {
  breweries: string[];
  today: string;
}) {
  const router = useRouter();
  const datalistId = useId();
  const dateInputId = useId();
  const breweryInputId = useId();

  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    createScheduledTakeoverAction,
    null,
  );
  const prevRef = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state || state === prevRef.current) return;
    prevRef.current = state;
    if (state.ok) {
      router.refresh();
      toast.success('Takeover scheduled.');
      formRef.current?.reset();
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fieldErrors =
    state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Date field */}
        <div className="space-y-1.5">
          <Label
            htmlFor={dateInputId}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Date
          </Label>
          <Input
            id={dateInputId}
            name="date"
            type="date"
            min={today}
            required
            aria-invalid={Boolean(fieldErrors.date?.length)}
            aria-describedby={
              fieldErrors.date?.length ? `${dateInputId}-error` : undefined
            }
          />
          {fieldErrors.date?.length ? (
            <p
              id={`${dateInputId}-error`}
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.date[0]}
            </p>
          ) : null}
        </div>

        {/* Brewery field */}
        <div className="space-y-1.5">
          <Label
            htmlFor={breweryInputId}
            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
          >
            Brewery
          </Label>
          <input
            id={breweryInputId}
            name="brewery"
            type="text"
            list={datalistId}
            required
            autoComplete="off"
            placeholder="e.g. Goose Island"
            aria-invalid={Boolean(fieldErrors.brewery?.length)}
            aria-describedby={cn(
              fieldErrors.brewery?.length
                ? `${breweryInputId}-error`
                : `${breweryInputId}-hint`,
            )}
            className={cn(
              'h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-border bg-input px-3 py-1',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'transition-colors outline-none',
              'hover:border-[oklch(0.400_0.006_80)]',
              'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35',
              'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/35',
            )}
          />
          <datalist id={datalistId}>
            {breweries.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {fieldErrors.brewery?.length ? (
            <p
              id={`${breweryInputId}-error`}
              role="alert"
              className="text-xs text-destructive"
            >
              {fieldErrors.brewery[0]}
            </p>
          ) : (
            <p id={`${breweryInputId}-hint`} className="text-xs text-muted-foreground">
              Type the brewery name exactly as it appears on Untappd.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending && (
            <Loader2 className="size-4 animate-spin mr-1.5" aria-hidden="true" />
          )}
          {isPending ? 'Scheduling…' : 'Schedule'}
        </Button>
      </div>

      {state && !state.ok && state.error && !state.fieldErrors && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

// ─── Takeover list ────────────────────────────────────────────────────────────

function TakeoverList({
  takeovers,
  today,
}: {
  takeovers: ScheduledTakeover[];
  today: string;
}) {
  if (takeovers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-2">
        No takeovers scheduled.
      </p>
    );
  }

  // Defensive sort by date ascending (query already returns them sorted, but
  // re-sort here to guard against any ordering change at the call site).
  const sorted = [...takeovers].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div
      role="table"
      aria-label="Scheduled takeovers"
      className="w-full"
    >
      {/* Header row — hidden on mobile, visible on sm+ */}
      <div
        role="row"
        className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto] gap-x-4 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border"
      >
        <span role="columnheader">Status</span>
        <span role="columnheader">Date</span>
        <span role="columnheader">Brewery</span>
        <span role="columnheader" className="sr-only">Actions</span>
      </div>

      <ul className="divide-y divide-border" role="presentation">
        {sorted.map((t) => {
          const status = getTakeoverStatus(t.date, today);
          const formattedDate = formatTakeoverDate(t.date);
          return (
            <li
              key={t.id}
              role="row"
              className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3',
                'sm:grid sm:grid-cols-[auto_1fr_auto_auto] sm:flex-none',
                status === 'past' && 'opacity-60',
              )}
            >
              {/* Status badge */}
              <span role="cell">
                <StatusBadge status={status} />
              </span>

              {/* Date */}
              <span
                role="cell"
                className="text-sm text-foreground tabular-nums"
              >
                {formattedDate}
              </span>

              {/* Brewery */}
              <span
                role="cell"
                className="flex-1 sm:flex-none text-sm text-foreground font-medium truncate"
              >
                {t.brewery}
              </span>

              {/* Delete */}
              <span role="cell" className="ml-auto sm:ml-0">
                <DeleteTakeoverButton takeover={t} today={today} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ScheduledTakeoversCard({
  takeovers,
  breweries,
  today,
}: ScheduledTakeoversCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <CalendarDays className="size-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Scheduled Takeovers</CardTitle>
            <CardDescription>
              Book a brewery for a future date — it activates automatically
              that day and turns off when the day ends.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add form */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            Schedule a takeover
          </h3>
          <AddTakeoverForm breweries={breweries} today={today} />
        </div>

        {/* Divider */}
        <hr className="border-border" />

        {/* List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Scheduled
            {takeovers.length > 0 && (
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({takeovers.length})
              </span>
            )}
          </h3>
          <TakeoverList takeovers={takeovers} today={today} />
        </div>
      </CardContent>
    </Card>
  );
}
