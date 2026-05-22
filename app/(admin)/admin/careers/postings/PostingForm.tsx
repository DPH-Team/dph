'use client';

import { ResourceForm, type ActionState } from '@/components/admin/ResourceForm';
import { TagInput } from '@/components/admin/TagInput';
import { postingSchema } from '@/lib/validators/careers';
import type { CareerPosting } from '@/lib/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostingFormCreateProps {
  mode: 'create';
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

interface PostingFormEditProps {
  mode: 'edit';
  posting: CareerPosting;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

type PostingFormProps = PostingFormCreateProps | PostingFormEditProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function PostingForm(props: PostingFormProps) {
  const isEdit = props.mode === 'edit';
  const posting = isEdit ? props.posting : null;

  const defaultValues = {
    title: posting?.title ?? '',
    type: posting?.type ?? 'full_time',
    department: posting?.department ?? '',
    description: posting?.description ?? '',
    // responsibilities and requirements are handled by TagInput (uncontrolled)
    isOpen: posting?.isOpen ?? true,
    sortOrder: posting?.sortOrder ?? 0,
  };

  return (
    <ResourceForm
      schema={postingSchema}
      defaultValues={defaultValues}
      action={props.action}
      submitLabel={isEdit ? 'Save changes' : 'Create posting'}
      cancelHref="/admin/careers"
    >
      <ResourceForm.Section
        title="Posting details"
        description="Basic information shown to applicants on the public careers page."
      >
        <ResourceForm.Field name="title" label="Job title" required>
          <ResourceForm.TextInput
            name="title"
            placeholder="e.g. Taproom Host"
            maxLength={120}
          />
        </ResourceForm.Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ResourceForm.Field name="type" label="Employment type" required>
            {/* Native select — ResourceForm has no Select sub-component so we
                render directly; the hidden input pattern mirrors SwitchField. */}
            <select
              name="type"
              defaultValue={posting?.type ?? 'full_time'}
              className="h-9 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
            </select>
          </ResourceForm.Field>

          <ResourceForm.Field name="department" label="Department" required>
            <ResourceForm.TextInput
              name="department"
              placeholder="e.g. Front of House"
              maxLength={80}
            />
          </ResourceForm.Field>
        </div>

        <ResourceForm.Field
          name="description"
          label="Description"
          description="Overview of the role shown at the top of the posting. Max 2 000 characters."
          required
        >
          <ResourceForm.Textarea
            name="description"
            placeholder="Describe the role…"
            maxLength={2000}
            rows={5}
          />
        </ResourceForm.Field>
      </ResourceForm.Section>

      <ResourceForm.Section
        title="Responsibilities"
        description="What the hire will do day-to-day. One bullet per entry — press Enter or comma to add."
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none">
            Responsibilities
          </label>
          <p className="text-xs text-muted-foreground">
            One item per entry. Press Enter or comma to add, Backspace to remove the last item.
          </p>
          <TagInput
            name="responsibilities"
            defaultValue={posting?.responsibilities ?? []}
          />
        </div>
      </ResourceForm.Section>

      <ResourceForm.Section
        title="Requirements"
        description="What the ideal candidate brings. One bullet per entry — press Enter or comma to add."
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none">
            Requirements
          </label>
          <p className="text-xs text-muted-foreground">
            One item per entry. Press Enter or comma to add, Backspace to remove the last item.
          </p>
          <TagInput
            name="requirements"
            defaultValue={posting?.requirements ?? []}
          />
        </div>
      </ResourceForm.Section>

      <ResourceForm.Section title="Visibility &amp; ordering">
        <ResourceForm.Switch
          name="isOpen"
          label="Open for applications"
          description="When enabled, this posting is visible on the public careers page and accepts applications."
        />

        <ResourceForm.Field
          name="sortOrder"
          label="Sort order"
          description="Postings with a lower number appear first. Default is 0."
        >
          <ResourceForm.TextInput
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            className="w-28"
          />
        </ResourceForm.Field>
      </ResourceForm.Section>
    </ResourceForm>
  );
}
