'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { ResourceForm } from './ResourceForm';
import { CoverImageUpload } from './CoverImageUpload';
import { createEventSchema } from '@/lib/validators/event';
import { utcToVenueLocalInput } from '@/lib/datetime';
import { slugify } from '@/lib/slugify';
import type { ActionState } from '@/app/(admin)/admin/events/actions';
import type { Event } from '@/lib/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventFormProps {
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  event?: Event | null;
  /** Pre-generated UUID to use for both the cover path namespace and the DB row. */
  pendingId: string;
}

/**
 * The form field values use strings for datetime-local inputs.
 * The server action and zod schema handle coercion to Date objects.
 */
type EventFormValues = {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  descriptionMd: string;
  coverImagePath: string;
  coverImageAlt: string;
  ticketUrl: string;
  featured: boolean;
  published: boolean;
};

// ─── Slug auto-suggest sub-component ─────────────────────────────────────────

function SlugField() {
  const { watch, setValue, register, formState: { errors } } =
    useFormContext<EventFormValues>();
  const title = watch('title');
  const slug = watch('slug');
  const [manuallyEdited, setManuallyEdited] = useState(Boolean(slug));

  // Auto-derive slug from title until the user manually edits it
  useEffect(() => {
    if (!manuallyEdited && title) {
      setValue('slug', slugify(title), { shouldValidate: true });
    }
  }, [title, manuallyEdited, setValue]);

  const slugError = errors.slug as { message?: string } | undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="slug-field"
        className="flex items-center gap-2 text-sm leading-none font-medium select-none"
      >
        Slug
        <span className="text-xs text-muted-foreground font-normal">
          (auto-derived from title)
        </span>
      </label>
      <input
        id="slug-field"
        type="text"
        {...register('slug')}
        onChange={(e) => {
          setManuallyEdited(true);
          register('slug').onChange(e);
        }}
        aria-invalid={Boolean(slugError)}
        className={[
          'h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-border',
          'bg-input px-3 py-1 text-sm text-foreground font-mono transition-colors outline-none',
          'placeholder:text-muted-foreground',
          'hover:border-[oklch(0.400_0.006_80)]',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35',
          'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/35',
        ].join(' ')}
        placeholder="my-event-slug"
      />
      {slugError?.message && (
        <p role="alert" className="text-xs text-destructive mt-1">
          {slugError.message}
        </p>
      )}
    </div>
  );
}

// ─── Cover image field (bridges RHF with CoverImageUpload) ───────────────────

function CoverField({ eventId }: { eventId: string }) {
  const { watch, setValue } = useFormContext<EventFormValues>();
  const currentPath = watch('coverImagePath');

  const handleChange = useCallback(
    (path: string | null) => {
      setValue('coverImagePath', path ?? '', { shouldDirty: true });
    },
    [setValue],
  );

  return (
    <CoverImageUpload
      eventId={eventId}
      currentPath={currentPath || null}
      onChange={handleChange}
    />
  );
}

// ─── Hidden cover path bridge ─────────────────────────────────────────────────
// Syncs the RHF value into a real hidden input so FormData picks it up.

function HiddenCoverPath() {
  const { watch } = useFormContext<EventFormValues>();
  const path = watch('coverImagePath');
  return <input type="hidden" name="coverImagePath" value={path ?? ''} />;
}

// ─── EventForm ────────────────────────────────────────────────────────────────

export function EventForm({ action, event, pendingId }: EventFormProps) {
  const isEditing = Boolean(event);
  // Use the existing event id (edit) or the pre-generated pending id (create).
  const eventId = event?.id ?? pendingId;

  const defaultValues: EventFormValues = {
    id: eventId,
    title: event?.title ?? '',
    slug: event?.slug ?? '',
    startsAt: event?.startsAt
      ? utcToVenueLocalInput(new Date(event.startsAt))
      : '',
    endsAt: event?.endsAt
      ? utcToVenueLocalInput(new Date(event.endsAt))
      : '',
    descriptionMd: event?.descriptionMd ?? '',
    coverImagePath: event?.coverImagePath ?? '',
    coverImageAlt: event?.coverImageAlt ?? '',
    ticketUrl: event?.ticketUrl ?? '',
    featured: event?.featured ?? false,
    published: event?.published ?? false,
  };

  return (
    <ResourceForm<EventFormValues>
      schema={createEventSchema}
      defaultValues={defaultValues}
      action={action}
      submitLabel={isEditing ? 'Save changes' : 'Create event'}
      cancelHref="/admin/events"
      successMessage={isEditing ? 'Event updated.' : 'Event created.'}
    >
      {/* Hidden fields */}
      <input type="hidden" name="id" value={eventId} />

      <ResourceForm.Section
        title="Basic info"
        description="Event name, URL slug, and scheduling."
      >
        <ResourceForm.Field name="title" label="Title" required>
          <ResourceForm.TextInput
            name="title"
            placeholder="Jazz Night at the Haus"
          />
        </ResourceForm.Field>

        {/* Slug — custom component with auto-derive logic */}
        <SlugField />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResourceForm.Field
            name="startsAt"
            label="Starts at"
            description="America/Chicago (CDT/CST)"
            required
          >
            <ResourceForm.DateTimeInput name="startsAt" />
          </ResourceForm.Field>

          <ResourceForm.Field
            name="endsAt"
            label="Ends at"
            description="Leave blank for open-ended events"
          >
            <ResourceForm.DateTimeInput name="endsAt" />
          </ResourceForm.Field>
        </div>
      </ResourceForm.Section>

      <ResourceForm.Section
        title="Details"
        description="Description (Markdown supported) and cover image."
      >
        <ResourceForm.Field
          name="descriptionMd"
          label="Description"
          description="Markdown is rendered on the public event page."
        >
          <ResourceForm.Textarea
            name="descriptionMd"
            rows={8}
            placeholder="Tell guests what to expect…"
            className="max-h-80 overflow-y-auto resize-y"
          />
        </ResourceForm.Field>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm leading-none font-medium select-none">
            Cover image
          </label>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, or AVIF — max 5 MB. Ideal aspect ratio 16:9.
          </p>
          <HiddenCoverPath />
          <CoverField eventId={eventId} />
        </div>

        <ResourceForm.Field
          name="coverImageAlt"
          label="Cover image alt text"
          description="Describe the image for screen readers and SEO."
        >
          <ResourceForm.TextInput
            name="coverImageAlt"
            placeholder="Band performing on stage at District Pour Haus"
          />
        </ResourceForm.Field>

        <ResourceForm.Field
          name="ticketUrl"
          label="Ticket URL"
          description="Optional link to purchase tickets (must start with https://)."
        >
          <ResourceForm.UrlInput
            name="ticketUrl"
            placeholder="https://eventbrite.com/…"
          />
        </ResourceForm.Field>
      </ResourceForm.Section>

      <ResourceForm.Section
        title="Visibility"
        description="Control how this event appears on the site."
      >
        <ResourceForm.Switch
          name="featured"
          label="Featured"
          description="Pinned to the top of the events list and shown in the homepage strip."
        />
        <ResourceForm.Switch
          name="published"
          label="Published"
          description="Visible to the public. Drafts are only visible to admin users."
        />
      </ResourceForm.Section>
    </ResourceForm>
  );
}
