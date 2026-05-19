'use client';

import type { ActionState } from '@/components/admin/ResourceForm';
import { ResourceForm } from '@/components/admin/ResourceForm';
import {
  createMenuSectionSchema,
  updateMenuSectionSchema,
} from '@/lib/validators/menu';
import type { MenuSection } from '@/lib/db/schema';

interface SectionFormCreateProps {
  mode: 'create';
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

interface SectionFormEditProps {
  mode: 'edit';
  section: MenuSection;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

type SectionFormProps = SectionFormCreateProps | SectionFormEditProps;

export function SectionForm(props: SectionFormProps) {
  const isEdit = props.mode === 'edit';
  const section = isEdit ? props.section : null;

  const schema = isEdit ? updateMenuSectionSchema : createMenuSectionSchema;

  const defaultValues = {
    name: section?.name ?? '',
    slug: section?.slug ?? '',
    description: section?.description ?? '',
    sortOrder: section?.sortOrder ?? 0,
    available: section?.available ?? true,
  };

  return (
    <ResourceForm
      schema={schema}
      defaultValues={defaultValues}
      action={props.action}
      submitLabel={isEdit ? 'Save changes' : 'Create section'}
      cancelHref="/admin/menu"
    >
      <ResourceForm.Section title="Details">
        <ResourceForm.Field name="name" label="Name" required>
          <ResourceForm.TextInput
            name="name"
            placeholder="e.g. Starters"
            maxLength={80}
          />
        </ResourceForm.Field>

        <ResourceForm.Field
          name="slug"
          label="Slug"
          description={
            isEdit
              ? 'URL-safe identifier. Changing this may break existing bookmarks.'
              : 'Optional. Leave blank to auto-derive from the name.'
          }
        >
          <ResourceForm.TextInput
            name="slug"
            placeholder="auto-derived from name if empty"
            maxLength={80}
          />
        </ResourceForm.Field>

        <ResourceForm.Field
          name="description"
          label="Description"
          description="Shown under the section name on the public menu"
        >
          <ResourceForm.Textarea
            name="description"
            placeholder="A short description of this section…"
            maxLength={600}
            rows={3}
          />
        </ResourceForm.Field>
      </ResourceForm.Section>

      <ResourceForm.Section title="Display">
        <ResourceForm.Field
          name="sortOrder"
          label="Sort order"
          description="Sections with a lower number appear first."
        >
          <ResourceForm.TextInput
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            className="w-32"
          />
        </ResourceForm.Field>

        <ResourceForm.Field name="available" label="Availability">
          <ResourceForm.Switch
            name="available"
            label="Available"
            description="When off, the entire section and its items are hidden from the public menu."
          />
        </ResourceForm.Field>
      </ResourceForm.Section>
    </ResourceForm>
  );
}
