'use client';

import { useActionState, useEffect } from 'react';
import { useForm, useFieldArray, useFormContext, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AboutBodySchema } from '@/lib/validators/content-blocks';
import type { AboutBodyValue } from '@/lib/validators/content-blocks';
import type { ActionState } from '@/lib/types/action-state';

// ─── Form shape ───────────────────────────────────────────────────────────────
// useFieldArray requires arrays of objects. We wrap paragraphs (string[]) as
// { value: string }[] so the repeater works, then unwrap on submit.

const FormSchema = AboutBodySchema.extend({
  paragraphs: z
    .array(z.object({ value: z.string().min(1).max(2000).trim() }))
    .min(1)
    .max(20),
});

type FormValues = z.infer<typeof FormSchema>;

// Convert external AboutBodyValue (paragraphs: string[]) to form shape
function toFormValues(v: AboutBodyValue): FormValues {
  return {
    ...v,
    paragraphs: v.paragraphs.map((p) => ({ value: p })),
  };
}

// Convert form shape back to AboutBodyValue
function fromFormValues(v: FormValues): AboutBodyValue {
  return {
    ...v,
    paragraphs: v.paragraphs.map((p) => p.value),
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AboutBodyFormProps {
  initialValue: AboutBodyValue;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

// ─── Local UI helpers ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive mt-1">
      {message}
    </p>
  );
}

function Field({
  label,
  description,
  required,
  error,
  children,
  htmlFor,
}: {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className={cn(
          required && "after:content-['*'] after:ml-0.5 after:text-destructive",
        )}
      >
        {label}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
      <FieldError message={error} />
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border pb-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

// ─── Paragraphs repeater ──────────────────────────────────────────────────────

function ParagraphsRepeater() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paragraphs',
  });

  const paraErrors = errors.paragraphs;

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Story paragraphs</legend>
      <SectionHeading
        title="Story paragraphs"
        description="Narrative copy for the about section. At least one is required; up to 20 supported."
      />

      {typeof paraErrors === 'object' &&
        'message' in paraErrors &&
        typeof paraErrors.message === 'string' && (
          <p role="alert" className="text-xs text-destructive">
            {paraErrors.message}
          </p>
        )}

      <div className="space-y-3">
        {fields.map((field, idx) => {
          const fieldErr = Array.isArray(paraErrors) ? paraErrors[idx] : undefined;
          const errMsg = fieldErr?.value?.message;

          return (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Textarea
                  id={`paragraph-${idx}`}
                  {...register(`paragraphs.${idx}.value`)}
                  aria-invalid={Boolean(errMsg)}
                  aria-label={`Paragraph ${idx + 1}`}
                  placeholder={`Paragraph ${idx + 1}…`}
                  maxLength={2000}
                  rows={4}
                />
                {errMsg && (
                  <p role="alert" className="text-xs text-destructive">
                    {errMsg}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1 h-8 px-2"
                onClick={() => remove(idx)}
                disabled={fields.length <= 1}
                aria-label={`Remove paragraph ${idx + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {fields.length < 20 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => append({ value: '' })}
        >
          <Plus className="size-3.5" />
          Add paragraph
        </Button>
      )}
    </fieldset>
  );
}

// ─── RFID steps repeater ──────────────────────────────────────────────────────

function RfidStepsRepeater() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rfidSteps',
  });

  const stepErrors = errors.rfidSteps;

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">RFID steps</legend>
      <SectionHeading
        title="How it works — RFID steps"
        description="The numbered steps explaining the self-pour RFID process. 1–6 steps."
      />

      {typeof stepErrors === 'object' &&
        'message' in stepErrors &&
        typeof stepErrors.message === 'string' && (
          <p role="alert" className="text-xs text-destructive">
            {stepErrors.message}
          </p>
        )}

      <div className="space-y-4">
        {fields.map((field, idx) => {
          const e = Array.isArray(stepErrors) ? stepErrors[idx] : undefined;
          const cardId = `rfid-${idx}`;

          return (
            <div
              key={field.id}
              className="rounded-lg border border-border bg-card/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Step {idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 gap-1"
                  onClick={() => remove(idx)}
                  disabled={fields.length <= 1}
                  aria-label={`Remove step ${idx + 1}`}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Icon"
                  htmlFor={`${cardId}-icon`}
                  description='Lucide icon name, e.g. "credit-card".'
                  error={e?.icon?.message}
                >
                  <Input
                    id={`${cardId}-icon`}
                    {...register(`rfidSteps.${idx}.icon`)}
                    aria-invalid={Boolean(e?.icon)}
                    placeholder="credit-card"
                    maxLength={40}
                  />
                </Field>

                <Field
                  label="Label"
                  htmlFor={`${cardId}-label`}
                  required
                  description="Step heading. Max 80 characters."
                  error={e?.label?.message}
                >
                  <Input
                    id={`${cardId}-label`}
                    {...register(`rfidSteps.${idx}.label`)}
                    aria-invalid={Boolean(e?.label)}
                    placeholder="Get an RFID Card"
                    maxLength={80}
                  />
                </Field>
              </div>

              <Field
                label="Description"
                htmlFor={`${cardId}-description`}
                description="Explanatory copy. Max 300 characters."
                error={e?.description?.message}
              >
                <Textarea
                  id={`${cardId}-description`}
                  {...register(`rfidSteps.${idx}.description`)}
                  aria-invalid={Boolean(e?.description)}
                  placeholder="Tap your card at the kiosk or get one from the bar…"
                  maxLength={300}
                  rows={2}
                />
              </Field>
            </div>
          );
        })}
      </div>

      {fields.length < 6 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => append({ icon: '', label: '', description: '' })}
        >
          <Plus className="size-3.5" />
          Add step
        </Button>
      )}
    </fieldset>
  );
}

// ─── Values repeater ──────────────────────────────────────────────────────────

function ValuesRepeater() {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'values',
  });

  const valueErrors = errors.values;

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Brand values</legend>
      <SectionHeading
        title="Brand values"
        description="Values shown on the about page. 1–12 items. Toggle 'Game Day' for special styling."
      />

      {typeof valueErrors === 'object' &&
        'message' in valueErrors &&
        typeof valueErrors.message === 'string' && (
          <p role="alert" className="text-xs text-destructive">
            {valueErrors.message}
          </p>
        )}

      <div className="space-y-4">
        {fields.map((field, idx) => {
          const e = Array.isArray(valueErrors) ? valueErrors[idx] : undefined;
          const cardId = `value-${idx}`;
          const isGameDay = Boolean(watch(`values.${idx}.isGameDay`));

          return (
            <div
              key={field.id}
              className="rounded-lg border border-border bg-card/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Value {idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 gap-1"
                  onClick={() => remove(idx)}
                  disabled={fields.length <= 1}
                  aria-label={`Remove value ${idx + 1}`}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>

              <Field
                label="Title"
                htmlFor={`${cardId}-title`}
                required
                description="Max 80 characters."
                error={e?.title?.message}
              >
                <Input
                  id={`${cardId}-title`}
                  {...register(`values.${idx}.title`)}
                  aria-invalid={Boolean(e?.title)}
                  placeholder="Wisconsin First"
                  maxLength={80}
                />
              </Field>

              <Field
                label="Description"
                htmlFor={`${cardId}-description`}
                description="Max 300 characters."
                error={e?.description?.message}
              >
                <Textarea
                  id={`${cardId}-description`}
                  {...register(`values.${idx}.description`)}
                  aria-invalid={Boolean(e?.description)}
                  placeholder="Our tap list prioritizes Wisconsin breweries…"
                  maxLength={300}
                  rows={2}
                />
              </Field>

              {/* Game Day toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isGameDay}
                  aria-label="Mark as Game Day value"
                  onClick={() =>
                    setValue(`values.${idx}.isGameDay`, !isGameDay, {
                      shouldDirty: true,
                    })
                  }
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isGameDay ? 'bg-primary' : 'bg-[oklch(0.310_0.005_286)]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                      isGameDay ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
                <span className="text-xs text-muted-foreground">
                  Game Day value (applies special styling)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {fields.length < 12 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => append({ title: '', description: '' })}
        >
          <Plus className="size-3.5" />
          Add value
        </Button>
      )}
    </fieldset>
  );
}

// ─── Root form ────────────────────────────────────────────────────────────────

export function AboutBodyForm({ initialValue, action }: AboutBodyFormProps) {
  const [serverState, formAction, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(action, undefined);

  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toFormValues(initialValue),
    mode: 'onTouched',
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = methods;

  // Sync server field errors back into react-hook-form
  useEffect(() => {
    if (!serverState) return;
    if (serverState.ok) {
      toast.success('About body saved.');
    } else {
      toast.error(serverState.error ?? 'Something went wrong.');
      if (serverState.fieldErrors) {
        for (const [field, messages] of Object.entries(serverState.fieldErrors)) {
          setError(field as Parameters<typeof setError>[0], {
            type: 'server',
            message: messages?.[0] ?? 'Invalid value',
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState]);

  function onSubmit(data: FormValues) {
    const fd = new FormData();
    fd.set('value', JSON.stringify(fromFormValues(data)));
    formAction(fd);
  }

  function handleNativeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit(onSubmit)();
  }

  const e = errors;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleNativeSubmit} noValidate className="space-y-8">
        {/* ── Intro copy ─────────────────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="sr-only">Intro copy</legend>
          <SectionHeading
            title="Intro copy"
            description="The opening headline and lead sentence at the top of the about section."
          />

          <Field
            label="Headline"
            htmlFor="about-headline"
            required
            description="Max 120 characters."
            error={e.headline?.message}
          >
            <Input
              id="about-headline"
              {...register('headline')}
              aria-invalid={Boolean(e.headline)}
              placeholder="Our Haus is Your Haus"
              maxLength={120}
            />
          </Field>

          <Field
            label="Lead"
            htmlFor="about-lead"
            required
            description="Supporting sentence beneath the headline. Max 400 characters."
            error={e.lead?.message}
          >
            <Textarea
              id="about-lead"
              {...register('lead')}
              aria-invalid={Boolean(e.lead)}
              placeholder="We built District Pour Haus because…"
              maxLength={400}
              rows={3}
            />
          </Field>
        </fieldset>

        {/* ── Story paragraphs ──────────────────────────────────────── */}
        <ParagraphsRepeater />

        {/* ── RFID steps ────────────────────────────────────────────── */}
        <RfidStepsRepeater />

        {/* ── Brand values ──────────────────────────────────────────── */}
        <ValuesRepeater />

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
