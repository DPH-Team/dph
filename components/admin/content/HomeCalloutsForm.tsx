'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { HomeCalloutsSchema } from '@/lib/validators/content-blocks';
import type { HomeCalloutsValue } from '@/lib/validators/content-blocks';
import type { ActionState } from '@/lib/types/action-state';
import { z } from 'zod';

// Wrapper schema so zodResolver can handle a top-level array via an object key
const WrappedSchema = z.object({ items: HomeCalloutsSchema });

// ─── Props ────────────────────────────────────────────────────────────────────

interface HomeCalloutsFormProps {
  initialValue: HomeCalloutsValue;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

// ─── Small layout helpers ─────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeCalloutsForm({ initialValue, action }: HomeCalloutsFormProps) {
  const [serverState, formAction, isPending] = useActionState<
    ActionState | undefined,
    FormData
  >(action, undefined);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof WrappedSchema>>({
    resolver: zodResolver(WrappedSchema),
    defaultValues: { items: initialValue },
    mode: 'onTouched',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Sync server field errors
  useEffect(() => {
    if (!serverState) return;
    if (serverState.ok) {
      toast.success('Home callouts saved.');
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

  function onSubmit(data: z.infer<typeof WrappedSchema>) {
    const fd = new FormData();
    fd.set('value', JSON.stringify(data.items));
    startTransition(() => formAction(fd));
  }

  function handleNativeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSubmit(onSubmit)();
  }

  const itemErrors = errors.items;

  return (
    <form onSubmit={handleNativeSubmit} noValidate className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="sr-only">Callout items</legend>
        <div className="border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-foreground">Callout items</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Between 1 and 6 items. Each card needs at minimum a title and body
            copy. Eyebrow, link, and CTA label are optional.
          </p>
        </div>

        {/* Root-level array error (e.g. "at least one callout required") */}
        {typeof itemErrors === 'object' &&
          'message' in itemErrors &&
          typeof itemErrors.message === 'string' && (
            <p role="alert" className="text-xs text-destructive">
              {itemErrors.message}
            </p>
          )}

        <div className="space-y-6">
          {fields.map((field, idx) => {
            const e = Array.isArray(itemErrors) ? itemErrors[idx] : undefined;
            const cardId = `callout-${idx}`;

            return (
              <div
                key={field.id}
                className="rounded-lg border border-border bg-card/40 p-4 space-y-4"
              >
                {/* Card header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Item {idx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 gap-1"
                    onClick={() => remove(idx)}
                    disabled={fields.length <= 1}
                    aria-label={`Remove callout item ${idx + 1}`}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Eyebrow"
                    htmlFor={`${cardId}-eyebrow`}
                    description="Small label above the title. Optional."
                    error={e?.eyebrow?.message}
                  >
                    <Input
                      id={`${cardId}-eyebrow`}
                      {...register(`items.${idx}.eyebrow`)}
                      aria-invalid={Boolean(e?.eyebrow)}
                      placeholder="Self-Pour"
                      maxLength={60}
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
                      {...register(`items.${idx}.title`)}
                      aria-invalid={Boolean(e?.title)}
                      placeholder="32 Taps, Your Rules"
                      maxLength={80}
                    />
                  </Field>
                </div>

                <Field
                  label="Body"
                  htmlFor={`${cardId}-body`}
                  required
                  description="Supporting copy. Max 300 characters."
                  error={e?.body?.message}
                >
                  <Textarea
                    id={`${cardId}-body`}
                    {...register(`items.${idx}.body`)}
                    aria-invalid={Boolean(e?.body)}
                    placeholder="Load an RFID card and pour exactly what you want…"
                    maxLength={300}
                    rows={3}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Link"
                    htmlFor={`${cardId}-href`}
                    description="Optional. Relative path or full URL."
                    error={e?.href?.message}
                  >
                    <Input
                      id={`${cardId}-href`}
                      {...register(`items.${idx}.href`)}
                      aria-invalid={Boolean(e?.href)}
                      placeholder="/taps"
                    />
                  </Field>

                  <Field
                    label="CTA label"
                    htmlFor={`${cardId}-cta`}
                    description="Optional. Button text on the card."
                    error={e?.cta?.message}
                  >
                    <Input
                      id={`${cardId}-cta`}
                      {...register(`items.${idx}.cta`)}
                      aria-invalid={Boolean(e?.cta)}
                      placeholder="See What's Pouring"
                      maxLength={40}
                    />
                  </Field>
                </div>
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
            onClick={() =>
              append({ title: '', body: '' })
            }
          >
            <Plus className="size-3.5" />
            Add callout
          </Button>
        )}
      </fieldset>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
