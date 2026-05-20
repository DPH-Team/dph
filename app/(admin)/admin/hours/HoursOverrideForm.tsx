'use client';

import { useWatch } from 'react-hook-form';
import type { ActionState } from '@/components/admin/ResourceForm';
import { ResourceForm } from '@/components/admin/ResourceForm';
import {
  createHoursOverrideSchema,
  updateHoursOverrideSchema,
} from '@/lib/validators/hours';
import type { HoursOverride } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoursOverrideFormCreateProps {
  mode: 'create';
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

interface HoursOverrideFormEditProps {
  mode: 'edit';
  override: HoursOverride;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

type HoursOverrideFormProps =
  | HoursOverrideFormCreateProps
  | HoursOverrideFormEditProps;

// ─── Helper: trim HH:MM:SS → HH:MM ───────────────────────────────────────────

function trimTime(t: string | null | undefined): string {
  if (!t) return '';
  // Postgres returns 'HH:MM:SS' — slice to 'HH:MM' for <input type="time">
  return t.slice(0, 5);
}

// ─── Inner component that reads closed state to disable time inputs ───────────

function TimeFields() {
  const closed = useWatch<{ closed: boolean }>({ name: 'closed' }) as boolean;

  return (
    <div className="grid grid-cols-2 gap-4">
      <ResourceForm.Field name="openTime" label="Opens at" required={!closed}>
        <ResourceForm.TextInput
          name="openTime"
          type="time"
          disabled={closed}
          className={cn(closed && 'opacity-40 cursor-not-allowed')}
        />
      </ResourceForm.Field>
      <ResourceForm.Field
        name="closeTime"
        label="Closes at"
        required={!closed}
        description="Use 00:00 for midnight."
      >
        <ResourceForm.TextInput
          name="closeTime"
          type="time"
          disabled={closed}
          className={cn(closed && 'opacity-40 cursor-not-allowed')}
        />
      </ResourceForm.Field>
    </div>
  );
}

// ─── Form component ───────────────────────────────────────────────────────────

export function HoursOverrideForm(props: HoursOverrideFormProps) {
  const isEdit = props.mode === 'edit';
  const override = isEdit ? props.override : null;

  const schema = isEdit ? updateHoursOverrideSchema : createHoursOverrideSchema;

  const defaultValues = {
    date: override?.date ?? '',
    closed: override?.closed ?? false,
    openTime: trimTime(override?.openTime),
    closeTime: trimTime(override?.closeTime),
    note: override?.note ?? '',
  };

  return (
    <ResourceForm
      schema={schema}
      defaultValues={defaultValues}
      action={props.action}
      submitLabel={isEdit ? 'Save changes' : 'Create override'}
      cancelHref="/admin/hours"
    >
      <ResourceForm.Section title="Date and hours">
        <ResourceForm.Field name="date" label="Date" required>
          <ResourceForm.TextInput name="date" type="date" />
        </ResourceForm.Field>

        <ResourceForm.Field name="closed" label="Status">
          <ResourceForm.Switch
            name="closed"
            label="Closed all day"
            description="When on, the venue is closed for the entire day and the time inputs are ignored."
          />
        </ResourceForm.Field>

        <TimeFields />

        <ResourceForm.Field
          name="note"
          label="Note"
          description="Optional. Shown on the public hours card when applicable. Max 200 characters."
        >
          <ResourceForm.Textarea
            name="note"
            maxLength={200}
            rows={2}
            placeholder="e.g. Early close for staff event"
          />
        </ResourceForm.Field>
      </ResourceForm.Section>
    </ResourceForm>
  );
}
