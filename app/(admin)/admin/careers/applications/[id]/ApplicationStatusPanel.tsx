'use client';

import { useActionState } from 'react';
import { toast } from 'sonner';
import { Loader2, Inbox, Eye, Archive } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ActionState } from '@/lib/types/action-state';
import type { ApplicationStatus } from '@/lib/validators/careers';

interface ApplicationStatusPanelProps {
  id: string;
  currentStatus: ApplicationStatus;
  handledAt: Date | null;
  updateAction: (
    prev: ActionState | null,
    formData: FormData,
  ) => Promise<ActionState>;
}

const STATUS_OPTIONS: {
  value: ApplicationStatus;
  label: string;
  icon: React.ElementType;
  activeClass: string;
  iconClass: string;
}[] = [
  {
    value: 'new',
    label: 'New',
    icon: Inbox,
    activeClass:
      'border-[oklch(0.648_0.130_47_/_0.5)] bg-[oklch(0.648_0.130_47_/_0.18)] text-[oklch(0.80_0.08_47)]',
    iconClass: 'text-[oklch(0.80_0.08_47)]',
  },
  {
    value: 'reviewed',
    label: 'Reviewed',
    icon: Eye,
    activeClass: 'border-blue-500/60 bg-blue-500/10 text-blue-300',
    iconClass: 'text-blue-400',
  },
  {
    value: 'archived',
    label: 'Archived',
    icon: Archive,
    activeClass:
      'border-border bg-[oklch(0.198_0.003_286)] text-muted-foreground',
    iconClass: 'text-muted-foreground',
  },
];

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function ApplicationStatusPanel({
  id,
  currentStatus,
  handledAt,
  updateAction,
}: ApplicationStatusPanelProps) {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    updateAction,
    null,
  );

  const prevStateRef = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state || state === prevStateRef.current) return;
    prevStateRef.current = state;
    if (state.ok) {
      toast.success('Status updated.');
    } else {
      toast.error(state.error ?? 'Failed to update status.');
    }
  }, [state]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Status</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Move this application through the review pipeline.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={id} />

        {/* Segmented status buttons */}
        <div
          role="group"
          aria-label="Application status"
          className="grid grid-cols-3 gap-2"
        >
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="submit"
                name="status"
                value={opt.value}
                disabled={isPending || isActive}
                aria-pressed={isActive}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
                  'disabled:cursor-default',
                  isActive
                    ? opt.activeClass
                    : 'border-border bg-[oklch(0.175_0.002_286)] text-muted-foreground hover:border-[oklch(0.400_0.006_80)] hover:text-foreground',
                )}
              >
                {isPending && !isActive ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon
                    className={cn(
                      'size-4',
                      isActive ? opt.iconClass : 'text-muted-foreground',
                    )}
                    aria-hidden="true"
                  />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* handled_at stamp */}
        {handledAt && currentStatus !== 'new' && (
          <p className="text-xs text-muted-foreground">
            Handled {relativeTime(new Date(handledAt))}
          </p>
        )}

        {state && !state.ok && state.error && (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
