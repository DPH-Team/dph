'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SiteBannerSchema } from '@/lib/validators/content-blocks';
import type { SiteBannerValue } from '@/lib/validators/content-blocks';
import type { ActionState } from '@/lib/types/action-state';

// ─── Form shape ───────────────────────────────────────────────────────────────
// react-hook-form's zodResolver types the form values as the schema INPUT type
// (fields with .default() are optional/undefined in input, required in output).
// We use z.input here so the generic matches what zodResolver provides.

const FormSchema = SiteBannerSchema;

type FormValues = z.input<typeof FormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SiteBannerFormProps {
  initialValue: SiteBannerValue;
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

// ─── Root form ────────────────────────────────────────────────────────────────

export function SiteBannerForm({ initialValue, action }: SiteBannerFormProps) {
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
    setValue,
    watch,
    setError,
    formState: { errors },
  } = methods;

  // react-hook-form's watch() is flagged by the React Compiler as an incompatible library;
  // this is a known RHF/React-Compiler interaction with no pure-code workaround.
  // eslint-disable-next-line react-hooks/incompatible-library
  const enabled = watch('enabled');
  const pinned = watch('pinned');
  const buttonLabel = watch('buttonLabel');
  const buttonHref = watch('buttonHref');
  const buttonWillShow = Boolean(buttonLabel?.trim()) && Boolean(buttonHref?.trim());

  // Sync server field errors back into react-hook-form
  useEffect(() => {
    if (!serverState) return;
    if (serverState.ok) {
      toast.success('Site banner saved.');
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

  // data is the schema INPUT (with defaults applied by zod on parse) — cast via SiteBannerValue.
  function onSubmit(data: FormValues) {
    const fd = new FormData();
    fd.set('value', JSON.stringify(data as SiteBannerValue));
    startTransition(() => formAction(fd));
  }

  function handleNativeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit(onSubmit)();
  }

  const e = errors;

  return (
    <form onSubmit={handleNativeSubmit} noValidate className="space-y-8">
      {/* ── Visibility ────────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="sr-only">Visibility</legend>
        <SectionHeading
          title="Visibility"
          description="This banner appears at the top of every public page in the site's green/gold accent colors."
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Enable site banner"
            onClick={() =>
              setValue('enabled', !enabled, { shouldDirty: true, shouldValidate: true })
            }
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              enabled ? 'bg-primary' : 'bg-[oklch(0.310_0.005_286)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                enabled ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
          <span className="text-xs text-muted-foreground">
            {enabled ? 'Banner is shown on the public site' : 'Banner is hidden'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={pinned}
            aria-label="Pin to top while scrolling"
            onClick={() =>
              setValue('pinned', !pinned, { shouldDirty: true, shouldValidate: true })
            }
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              pinned ? 'bg-primary' : 'bg-[oklch(0.310_0.005_286)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                pinned ? 'translate-x-4' : 'translate-x-0',
              )}
            />
          </button>
          <div className="space-y-0.5">
            <span className="block text-xs text-muted-foreground">
              Pin to top while scrolling
            </span>
            <span className="block text-xs text-muted-foreground/70">
              Desktop only — banner + header stay pinned as visitors scroll; on mobile
              the banner always scrolls away to preserve screen space.
            </span>
          </div>
        </div>
      </fieldset>

      {/* ── Copy ──────────────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="sr-only">Banner copy</legend>
        <SectionHeading
          title="Banner copy"
          description="The message shown inside the banner."
        />

        <Field
          label="Title"
          htmlFor="banner-title"
          required={enabled}
          description="Required when the banner is enabled. Max 120 characters."
          error={e.title?.message}
        >
          <Input
            id="banner-title"
            {...register('title')}
            aria-invalid={Boolean(e.title)}
            placeholder="Kitchen closes early on Sundays"
            maxLength={120}
          />
        </Field>

        <Field
          label="Subtext"
          htmlFor="banner-subtext"
          description="Optional supporting detail. Max 300 characters."
          error={e.subtext?.message}
        >
          <Textarea
            id="banner-subtext"
            {...register('subtext')}
            aria-invalid={Boolean(e.subtext)}
            placeholder="Last call for food is 8pm on Sundays through the fall."
            maxLength={300}
            rows={2}
          />
        </Field>
      </fieldset>

      {/* ── Button ────────────────────────────────────────────────── */}
      <fieldset className="space-y-4">
        <legend className="sr-only">Banner button</legend>
        <SectionHeading
          title="Button (optional)"
          description="The button only renders on the public site when both fields below are filled in."
        />

        <Field
          label="Button label"
          htmlFor="banner-button-label"
          description="Max 40 characters."
          error={e.buttonLabel?.message}
        >
          <Input
            id="banner-button-label"
            {...register('buttonLabel')}
            aria-invalid={Boolean(e.buttonLabel)}
            placeholder="Reserve a table"
            maxLength={40}
          />
        </Field>

        <Field
          label="Button link"
          htmlFor="banner-button-href"
          description="An internal path like /reserve, or a full https:// URL."
          error={e.buttonHref?.message}
        >
          <Input
            id="banner-button-href"
            {...register('buttonHref')}
            aria-invalid={Boolean(e.buttonHref)}
            placeholder="/reserve"
          />
        </Field>

        <p className="text-xs text-muted-foreground">
          {buttonWillShow
            ? 'The button will be shown.'
            : 'The button will be hidden until both the label and link are filled in.'}
        </p>
      </fieldset>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
