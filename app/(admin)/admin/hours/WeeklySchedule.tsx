'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { weeklyScheduleSchema, DAY_OF_WEEK } from '@/lib/validators/hours';
import type { WeeklyHourRow } from '@/lib/db/schema';
import type { ActionState } from '@/lib/types/action-state';
import { cn } from '@/lib/utils';

// ─── Day label map ─────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const TIME_INPUT_CLASSES = cn(
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm',
  'transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium',
  'placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

// ─── Controlled time input ────────────────────────────────────────────────────
//
// Time inputs must be controlled — React 19's <form action={...}> auto-resets
// the form after a successful server action, which would wipe uncontrolled
// inputs. Binding value + onChange keeps the DOM in sync with RHF state.

function TimeInput({
  name,
  id,
  disabled,
}: {
  name: string;
  id: string;
  disabled: boolean;
}) {
  const { setValue } = useFormContext();
  const value = (useWatch({ name }) as string | undefined) ?? '';

  return (
    <input
      id={id}
      name={name}
      type="time"
      value={value}
      onChange={(e) =>
        setValue(name, e.target.value, { shouldDirty: true })
      }
      disabled={disabled}
      className={TIME_INPUT_CLASSES}
    />
  );
}

// ─── Single day row ────────────────────────────────────────────────────────────

function DayRow({ index, dayOfWeek }: { index: number; dayOfWeek: string }) {
  const closed = useWatch({ name: `days.${index}.closed` }) as boolean;

  const label = DAY_LABELS[dayOfWeek] ?? dayOfWeek;

  return (
    <fieldset
      className={cn(
        'grid grid-cols-[110px_120px_1fr_1fr] gap-3 items-center py-3',
        index !== 0 && 'border-t border-border',
        'max-md:grid-cols-none max-md:flex max-md:flex-col max-md:gap-2',
      )}
    >
      <legend className="sr-only">{label} hours</legend>

      {/* Hidden field carries the dayOfWeek value into FormData */}
      <input
        type="hidden"
        name={`days.${index}.dayOfWeek`}
        value={dayOfWeek}
      />

      <span className="text-sm font-medium text-foreground">{label}</span>

      <div className="max-md:flex max-md:flex-row max-md:gap-3 max-md:items-center md:contents">
        {/* Closed toggle — Switch already provides its own hidden input */}
        <div className="flex items-center gap-2 md:col-start-2">
          <ResourceForm.Switch
            name={`days.${index}.closed`}
            label="Closed"
          />
        </div>

        {/* Open time */}
        <div className="flex flex-col gap-1 md:col-start-3">
          <label
            className="text-xs text-muted-foreground md:sr-only"
            htmlFor={`days-${index}-openTime`}
          >
            Opens at
          </label>
          <TimeInput
            id={`days-${index}-openTime`}
            name={`days.${index}.openTime`}
            disabled={Boolean(closed)}
          />
          <RowFieldError name={`days.${index}.openTime`} />
        </div>

        {/* Close time */}
        <div className="flex flex-col gap-1 md:col-start-4">
          <label
            className="text-xs text-muted-foreground md:sr-only"
            htmlFor={`days-${index}-closeTime`}
          >
            Closes at
          </label>
          <TimeInput
            id={`days-${index}-closeTime`}
            name={`days.${index}.closeTime`}
            disabled={Boolean(closed)}
          />
          <RowFieldError name={`days.${index}.closeTime`} />
        </div>
      </div>
    </fieldset>
  );
}

// ─── Inline field error ────────────────────────────────────────────────────────

function RowFieldError({ name }: { name: string }) {
  const { formState } = useFormContext();
  const error = name.split('.').reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown>)?.[key],
    formState.errors,
  ) as { message?: string } | undefined;

  if (!error?.message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {error.message}
    </p>
  );
}

// ─── Column headers (desktop only) ────────────────────────────────────────────

function GridHeaders() {
  return (
    <div
      className="hidden md:grid grid-cols-[110px_120px_1fr_1fr] gap-3 pb-2 border-b border-border"
      aria-hidden="true"
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Day
      </span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Status
      </span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Opens at
      </span>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Closes at
      </span>
    </div>
  );
}

// ─── Sync RHF state when server-side rows change ──────────────────────────────
//
// After a successful save the page revalidates and re-renders with fresh DB
// values. RHF's useForm({ defaultValues }) only reads defaults on mount, so we
// push the new server values into form state explicitly. This also undoes any
// stale state left over from React 19's post-submit form reset.

function SyncFromServer({
  defaults,
}: {
  defaults: WeeklyScheduleValues;
}) {
  const { reset } = useFormContext();
  const serialized = JSON.stringify(defaults);

  useEffect(() => {
    reset(defaults);
    // serialized is the dependency; defaults is read inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, reset]);

  return null;
}

// ─── Defaults builder ─────────────────────────────────────────────────────────

interface WeeklyScheduleValues {
  days: Array<{
    dayOfWeek: string;
    closed: boolean;
    openTime: string;
    closeTime: string;
  }>;
}

function trimTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

function buildDefaults(rows: WeeklyHourRow[]): WeeklyScheduleValues {
  const rowMap = new Map(rows.map((r) => [r.dayOfWeek, r]));
  return {
    days: DAY_OF_WEEK.map((dow) => {
      const r = rowMap.get(dow);
      return {
        dayOfWeek: dow,
        closed: r?.closed ?? false,
        openTime: trimTime(r?.openTime),
        closeTime: trimTime(r?.closeTime),
      };
    }),
  };
}

// ─── WeeklySchedule ────────────────────────────────────────────────────────────

interface WeeklyScheduleProps {
  rows: WeeklyHourRow[];
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

export function WeeklySchedule({ rows, action }: WeeklyScheduleProps) {
  const defaultValues = buildDefaults(rows);

  return (
    <ResourceForm
      schema={weeklyScheduleSchema}
      defaultValues={defaultValues}
      action={action}
      submitLabel="Save weekly schedule"
      successMessage="Weekly schedule saved."
    >
      <SyncFromServer defaults={defaultValues} />

      <p className="text-xs text-muted-foreground -mt-2">
        Use 00:00 for midnight close (e.g. Friday and Saturday).
      </p>

      <GridHeaders />

      {DAY_OF_WEEK.map((dow, i) => (
        <DayRow key={dow} index={i} dayOfWeek={dow} />
      ))}
    </ResourceForm>
  );
}
