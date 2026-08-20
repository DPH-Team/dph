'use client';

import { startTransition, useActionState, useEffect } from 'react';
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
import { CareersBodySchema } from '@/lib/validators/content-blocks';
import type { CareersBodyValue } from '@/lib/validators/content-blocks';
import type { ActionState } from '@/lib/types/action-state';
import { IconPickerField } from '@/components/admin/content/IconPickerField';

// ─── Form shape ───────────────────────────────────────────────────────────────
// CareersBodyValue maps 1:1 to the form shape (no array-of-strings fields that
// need wrapping like About's paragraphs), so FormSchema and CareersBodyValue
// are the same type. Kept as a separate alias for symmetry with other forms.

const FormSchema = CareersBodySchema;

type FormValues = z.infer<typeof FormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CareersBodyFormProps {
  initialValue: CareersBodyValue;
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

// ─── Why us repeater ──────────────────────────────────────────────────────────

function WhyUsRepeater() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'whyUs',
  });

  const whyUsErrors = errors.whyUs;

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Why us cards</legend>
      <SectionHeading
        title="What we offer — cards"
        description="The 'why work here' cards on the careers page. 1–6 cards."
      />

      {typeof whyUsErrors === 'object' &&
        'message' in whyUsErrors &&
        typeof whyUsErrors.message === 'string' && (
          <p role="alert" className="text-xs text-destructive">
            {whyUsErrors.message}
          </p>
        )}

      <div className="space-y-4">
        {fields.map((field, idx) => {
          const e = Array.isArray(whyUsErrors) ? whyUsErrors[idx] : undefined;
          const cardId = `why-us-${idx}`;

          return (
            <div
              key={field.id}
              className="rounded-lg border border-border bg-card/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Card {idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 gap-1"
                  onClick={() => remove(idx)}
                  disabled={fields.length <= 1}
                  aria-label={`Remove card ${idx + 1}`}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Icon"
                  description="Choose the icon shown for this card."
                  error={e?.icon?.message}
                >
                  <IconPickerField
                    name={`whyUs.${idx}.icon`}
                    label={`Icon for card ${idx + 1}`}
                  />
                </Field>

                <Field
                  label="Title"
                  htmlFor={`${cardId}-title`}
                  required
                  description="Card heading. Max 80 characters."
                  error={e?.title?.message}
                >
                  <Input
                    id={`${cardId}-title`}
                    {...register(`whyUs.${idx}.title`)}
                    aria-invalid={Boolean(e?.title)}
                    placeholder="Competitive pay"
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
                  {...register(`whyUs.${idx}.description`)}
                  aria-invalid={Boolean(e?.description)}
                  placeholder="We pay above market for every role…"
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
          onClick={() => append({ icon: '', title: '', description: '' })}
        >
          <Plus className="size-3.5" />
          Add card
        </Button>
      )}
    </fieldset>
  );
}

// ─── Root form ────────────────────────────────────────────────────────────────

export function CareersBodyForm({ initialValue, action }: CareersBodyFormProps) {
  const [serverState, formAction, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(action, undefined);

  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initialValue,
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
      toast.success('Careers body saved.');
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
    fd.set('value', JSON.stringify(data));
    startTransition(() => formAction(fd));
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
            description="The eyebrow, headline, and lead sentence at the top of the careers page."
          />

          <Field
            label="Eyebrow"
            htmlFor="careers-eyebrow"
            description="Small label above the headline. Max 80 characters."
            error={e.eyebrow?.message}
          >
            <Input
              id="careers-eyebrow"
              {...register('eyebrow')}
              aria-invalid={Boolean(e.eyebrow)}
              placeholder="Hiring"
              maxLength={80}
            />
          </Field>

          <Field
            label="Headline"
            htmlFor="careers-headline"
            required
            description="Max 120 characters."
            error={e.headline?.message}
          >
            <Input
              id="careers-headline"
              {...register('headline')}
              aria-invalid={Boolean(e.headline)}
              placeholder="Work With Us"
              maxLength={120}
            />
          </Field>

          <Field
            label="Lead"
            htmlFor="careers-lead"
            required
            description="Supporting sentence beneath the headline. Max 400 characters."
            error={e.lead?.message}
          >
            <Textarea
              id="careers-lead"
              {...register('lead')}
              aria-invalid={Boolean(e.lead)}
              placeholder="We're hiring people who give a damn…"
              maxLength={400}
              rows={3}
            />
          </Field>
        </fieldset>

        {/* ── "Why us" section intro ───────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="sr-only">Why us section intro</legend>
          <SectionHeading
            title="What we offer — section intro"
            description="The eyebrow and heading above the why-us cards."
          />

          <Field
            label="Eyebrow"
            htmlFor="careers-why-eyebrow"
            description="Small label above the heading. Max 80 characters."
            error={e.whyEyebrow?.message}
          >
            <Input
              id="careers-why-eyebrow"
              {...register('whyEyebrow')}
              aria-invalid={Boolean(e.whyEyebrow)}
              placeholder="Why DPH"
              maxLength={80}
            />
          </Field>

          <Field
            label="Heading"
            htmlFor="careers-why-heading"
            required
            description="Max 120 characters."
            error={e.whyHeading?.message}
          >
            <Input
              id="careers-why-heading"
              {...register('whyHeading')}
              aria-invalid={Boolean(e.whyHeading)}
              placeholder="What we offer"
              maxLength={120}
            />
          </Field>
        </fieldset>

        {/* ── Why us cards ──────────────────────────────────────────── */}
        <WhyUsRepeater />

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
