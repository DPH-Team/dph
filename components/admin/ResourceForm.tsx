'use client';

import React, { useActionState, useEffect, useId } from 'react';
import {
  useForm,
  FormProvider,
  useFormContext,
  type FieldValues,
  type DefaultValues,
  type FieldError,
  type Path,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ─── Shared action result type ────────────────────────────────────────────────
// Previously imported from events/actions; moved here so ResourceForm is
// generic and not coupled to any specific admin section.

export type ActionState =
  | { ok: true; id?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

// ─── Types ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyZodSchema = z.ZodType<any, any, any>;

export type ResourceFormProps<T extends FieldValues> = {
  schema: AnyZodSchema;
  defaultValues: DefaultValues<T>;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  cancelHref?: string;
  successMessage?: string;
};

// ─── Root form component ──────────────────────────────────────────────────────

function ResourceFormRoot<T extends FieldValues>({
  schema,
  defaultValues,
  action,
  children,
  submitLabel = 'Save',
  cancelHref,
  successMessage = 'Saved successfully.',
}: ResourceFormProps<T>) {
  const [serverState, formAction, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(action, undefined);

  const methods = useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
    mode: 'onTouched',
  });

  const { handleSubmit, setError, formState } = methods;

  // Sync server field errors back into react-hook-form
  useEffect(() => {
    if (!serverState) return;
    if (serverState.ok) {
      toast.success(successMessage);
    } else {
      toast.error(serverState.error ?? 'Something went wrong.');
      if (serverState.fieldErrors) {
        for (const [field, messages] of Object.entries(
          serverState.fieldErrors,
        )) {
          setError(field as Path<T>, {
            type: 'server',
            message: messages?.[0] ?? 'Invalid value',
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState]);

  return (
    <FormProvider {...methods}>
      <form
        action={formAction}
        onSubmit={(e) => {
          // Client-side zod validation first; if it fails, don't submit.
          handleSubmit(() => {
            // react-hook-form validated — let the native form action proceed
            // via the action= attribute on the form element.
          })(e);
        }}
        noValidate
        className="space-y-8"
      >
        {children}

        {/* Footer actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button
            type="submit"
            disabled={isPending || formState.isSubmitting}
            className="gap-2"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </Button>
          {cancelHref && (
            <Button
              variant="outline"
              render={<Link href={cancelHref} />}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ name, label, description, required, children }: FieldProps) {
  const id = useId();

  const {
    formState: { errors },
  } = useFormContext();

  const error = name.split('.').reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown>)?.[key],
    errors,
  ) as FieldError | undefined;

  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}
      >
        {label}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {/* Inject the matching id into the first focusable child */}
      {React.Children.map(children, (child, i) =>
        i === 0 && React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{
                id?: string;
                'aria-describedby'?: string;
              }>,
              {
                id,
                'aria-describedby': error ? errorId : undefined,
              },
            )
          : child,
      )}
      {error?.message && (
        <p id={errorId} role="alert" className="text-xs text-destructive mt-1">
          {error.message}
        </p>
      )}
    </div>
  );
}

// ─── TextInput ────────────────────────────────────────────────────────────────

interface TextInputProps extends Omit<React.ComponentProps<'input'>, 'name'> {
  name: string;
}

function TextInput({ name, id, ...rest }: TextInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldError = name.split('.').reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown>)?.[key],
    errors,
  ) as FieldError | undefined;

  return (
    <Input
      id={id}
      {...register(name)}
      aria-invalid={Boolean(fieldError)}
      {...rest}
    />
  );
}

// ─── TextareaInput ────────────────────────────────────────────────────────────

interface TextareaInputProps extends Omit<React.ComponentProps<'textarea'>, 'name'> {
  name: string;
}

function TextareaInput({ name, id, ...rest }: TextareaInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldError = name.split('.').reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown>)?.[key],
    errors,
  ) as FieldError | undefined;

  return (
    <Textarea
      id={id}
      {...register(name)}
      aria-invalid={Boolean(fieldError)}
      {...rest}
    />
  );
}

// ─── DateTimeInput ────────────────────────────────────────────────────────────

interface DateTimeInputProps
  extends Omit<React.ComponentProps<'input'>, 'type' | 'name'> {
  name: string;
}

function DateTimeInput({ name, id, ...rest }: DateTimeInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldError = name.split('.').reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown>)?.[key],
    errors,
  ) as FieldError | undefined;

  return (
    <Input
      id={id}
      type="datetime-local"
      {...register(name)}
      aria-invalid={Boolean(fieldError)}
      className="w-auto"
      {...rest}
    />
  );
}

// ─── UrlInput ────────────────────────────────────────────────────────────────

interface UrlInputProps
  extends Omit<React.ComponentProps<'input'>, 'type' | 'name'> {
  name: string;
}

function UrlInput({ name, id, ...rest }: UrlInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const fieldError = name.split('.').reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown>)?.[key],
    errors,
  ) as FieldError | undefined;

  return (
    <Input
      id={id}
      type="url"
      {...register(name)}
      aria-invalid={Boolean(fieldError)}
      placeholder="https://"
      {...rest}
    />
  );
}

// ─── Switch (boolean toggle) ──────────────────────────────────────────────────

interface SwitchFieldProps {
  name: string;
  label: string;
  description?: string;
}

function SwitchField({ name, label, description }: SwitchFieldProps) {
  const id = useId();
  const { setValue, watch } = useFormContext();
  const checked = Boolean(watch(name));

  return (
    <div className="flex items-start gap-3">
      {/* Hidden checkbox carries the boolean value into FormData as "true"/"false" */}
      <input type="hidden" name={name} value={checked ? 'true' : 'false'} />
      {/* Visual toggle */}
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={label}
        onClick={() => setValue(name, !checked, { shouldDirty: true })}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          checked ? 'bg-primary' : 'bg-[oklch(0.310_0.005_286)]',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none cursor-pointer select-none"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
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

// ─── Public API ───────────────────────────────────────────────────────────────

export const ResourceForm = Object.assign(ResourceFormRoot, {
  Field,
  TextInput,
  Textarea: TextareaInput,
  DateTimeInput,
  UrlInput,
  Switch: SwitchField,
  Section,
}) as typeof ResourceFormRoot & {
  Field: typeof Field;
  TextInput: typeof TextInput;
  Textarea: typeof TextareaInput;
  DateTimeInput: typeof DateTimeInput;
  UrlInput: typeof UrlInput;
  Switch: typeof SwitchField;
  Section: typeof Section;
};
