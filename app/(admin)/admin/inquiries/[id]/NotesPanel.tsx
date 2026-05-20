'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionState } from '@/lib/types/action-state';

const MAX_CHARS = 4000;

interface NotesPanelProps {
  id: string;
  initialNotes: string | null;
  updateAction: (
    prev: ActionState | null,
    formData: FormData,
  ) => Promise<ActionState>;
}

export function NotesPanel({ id, initialNotes, updateAction }: NotesPanelProps) {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    updateAction,
    null,
  );

  const [value, setValue] = useState(initialNotes ?? '');
  const prevStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state || state === prevStateRef.current) return;
    prevStateRef.current = state;
    if (state.ok) {
      toast.success('Notes saved.');
    } else {
      toast.error(state.error ?? 'Failed to save notes.');
    }
  }, [state]);

  const isDirty = value !== (initialNotes ?? '');
  const overLimit = value.length > MAX_CHARS;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Internal Notes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          These notes are internal only and are never shared with the guest.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={id} />

        <div className="space-y-1.5">
          <textarea
            name="internalNotes"
            id={`notes-${id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={MAX_CHARS}
            rows={6}
            placeholder="Add context, follow-up reminders, contact history…"
            aria-describedby={`notes-${id}-count`}
            className={cn(
              'flex min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground',
              'hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35',
              'disabled:cursor-not-allowed disabled:opacity-50',
              overLimit && 'border-destructive focus-visible:ring-destructive/35',
            )}
          />
          <p
            id={`notes-${id}-count`}
            className={cn(
              'text-xs tabular-nums text-right',
              overLimit ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {value.length} / {MAX_CHARS}
          </p>
        </div>

        {state && !state.ok && state.error && (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !isDirty || overLimit}
          className={cn(
            'inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors',
            'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save notes
        </button>
      </form>
    </div>
  );
}
