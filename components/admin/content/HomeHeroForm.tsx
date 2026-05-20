'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { HomeHeroSchema } from '@/lib/validators/content-blocks';
import type { HomeHeroValue } from '@/lib/validators/content-blocks';
import type { ActionState } from '@/lib/types/action-state';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HomeHeroFormProps {
  initialValue: HomeHeroValue;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

// ─── Field error helper ───────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive mt-1">
      {message}
    </p>
  );
}

// ─── Labelled field wrapper ───────────────────────────────────────────────────

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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{title}</legend>
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeHeroForm({ initialValue, action }: HomeHeroFormProps) {
  const [serverState, formAction, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(action, undefined);

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<HomeHeroValue>({
    resolver: zodResolver(HomeHeroSchema),
    defaultValues: initialValue,
    mode: 'onTouched',
  });

  // Sync server field errors back into react-hook-form
  useEffect(() => {
    if (!serverState) return;
    if (serverState.ok) {
      toast.success('Home hero saved.');
    } else {
      toast.error(serverState.error ?? 'Something went wrong.');
      if (serverState.fieldErrors) {
        for (const [field, messages] of Object.entries(
          serverState.fieldErrors,
        )) {
          setError(field as Parameters<typeof setError>[0], {
            type: 'server',
            message: messages?.[0] ?? 'Invalid value',
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState]);

  // On submit: serialise the typed value as JSON into a hidden FormData field.
  function onSubmit(data: HomeHeroValue) {
    const fd = new FormData();
    fd.set('value', JSON.stringify(data));
    startTransition(() => formAction(fd));
  }

  // react-hook-form's handleSubmit validates client-side before calling onSubmit.
  // We need to wire this to the form's native submit so useActionState's isPending
  // tracks correctly. We use a hybrid: native submit triggers handleSubmit, which
  // builds the FormData and calls formAction.
  function handleNativeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit(onSubmit)();
  }

  const e = errors;

  return (
    <form onSubmit={handleNativeSubmit} noValidate className="space-y-8">
      <Section
        title="Hero copy"
        description="Text shown in the full-width hero section on the home page."
      >
        <Field
          label="Eyebrow"
          htmlFor="eyebrow"
          description="Small label above the headline. Max 80 characters."
          error={e.eyebrow?.message}
        >
          <Input
            id="eyebrow"
            {...register('eyebrow')}
            aria-invalid={Boolean(e.eyebrow)}
            placeholder="Wisconsin Self-Pour Taproom"
            maxLength={80}
          />
        </Field>

        <Field
          label="Headline"
          htmlFor="headline"
          required
          description="The main heading. Max 120 characters."
          error={e.headline?.message}
        >
          <Input
            id="headline"
            {...register('headline')}
            aria-invalid={Boolean(e.headline)}
            placeholder="Our Haus is Your Haus"
            maxLength={120}
          />
        </Field>

        <Field
          label="Lead paragraph"
          htmlFor="lead"
          required
          description="Supporting copy beneath the headline. Max 400 characters."
          error={e.lead?.message}
        >
          <Textarea
            id="lead"
            {...register('lead')}
            aria-invalid={Boolean(e.lead)}
            placeholder="32 craft taps, a scratch kitchen…"
            maxLength={400}
            rows={3}
          />
        </Field>
      </Section>

      <Section
        title="Primary CTA"
        description="The main call-to-action button."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Label"
            htmlFor="primaryCta.label"
            required
            description="Button text. Max 40 characters."
            error={e.primaryCta?.label?.message}
          >
            <Input
              id="primaryCta.label"
              {...register('primaryCta.label')}
              aria-invalid={Boolean(e.primaryCta?.label)}
              placeholder="See What's Pouring"
              maxLength={40}
            />
          </Field>

          <Field
            label="Link"
            htmlFor="primaryCta.href"
            description="Relative path or full URL."
            error={e.primaryCta?.href?.message}
          >
            <Input
              id="primaryCta.href"
              {...register('primaryCta.href')}
              aria-invalid={Boolean(e.primaryCta?.href)}
              placeholder="/taps"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Secondary CTA"
        description="The secondary call-to-action button."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Label"
            htmlFor="secondaryCta.label"
            required
            description="Button text. Max 40 characters."
            error={e.secondaryCta?.label?.message}
          >
            <Input
              id="secondaryCta.label"
              {...register('secondaryCta.label')}
              aria-invalid={Boolean(e.secondaryCta?.label)}
              placeholder="Reserve a Table"
              maxLength={40}
            />
          </Field>

          <Field
            label="Link"
            htmlFor="secondaryCta.href"
            description="Relative path or full URL."
            error={e.secondaryCta?.href?.message}
          >
            <Input
              id="secondaryCta.href"
              {...register('secondaryCta.href')}
              aria-invalid={Boolean(e.secondaryCta?.href)}
              placeholder="/reservations"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Background image"
        description="Optional. Full URL to the hero background image. Leave blank to use the default."
      >
        <Field
          label="Image URL"
          htmlFor="imageUrl"
          description="Must be a full URL (https://…) or leave blank."
          error={e.imageUrl?.message}
        >
          <Input
            id="imageUrl"
            {...register('imageUrl', {
              setValueAs: (v: string) => (v === '' ? null : v),
            })}
            aria-invalid={Boolean(e.imageUrl)}
            placeholder="https://example.com/hero.jpg"
            type="url"
          />
        </Field>
      </Section>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>

      {/* Invisible — keeps TypeScript happy with getValues */}
      <span className="hidden">{JSON.stringify(getValues())}</span>
    </form>
  );
}
