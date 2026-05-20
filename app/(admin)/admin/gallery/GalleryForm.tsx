'use client';

import type { ActionState } from '@/components/admin/ResourceForm';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { CoverImageInput } from '@/components/admin/CoverImageInput';
import { TagInput } from '@/components/admin/TagInput';
import {
  galleryImageCreateSchema,
  galleryImageUpdateSchema,
} from '@/lib/validators/gallery';
import type { GalleryImage } from '@/lib/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryFormCreateProps {
  mode: 'create';
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  tagSuggestions?: string[];
}

interface GalleryFormEditProps {
  mode: 'edit';
  image: GalleryImage;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
  tagSuggestions?: string[];
}

type GalleryFormProps = GalleryFormCreateProps | GalleryFormEditProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function GalleryForm(props: GalleryFormProps) {
  const isEdit = props.mode === 'edit';
  const image = isEdit ? props.image : null;

  const schema = isEdit ? galleryImageUpdateSchema : galleryImageCreateSchema;

  const defaultValues = {
    imagePath: image?.imagePath ?? '',
    alt: image?.alt ?? '',
    tags: image?.tags ?? [],
    sortOrder: image?.sortOrder ?? 0,
  };

  return (
    <ResourceForm
      schema={schema}
      defaultValues={defaultValues}
      action={props.action}
      submitLabel={isEdit ? 'Save changes' : 'Upload image'}
      cancelHref="/admin/gallery"
    >
      <ResourceForm.Section title="Image">
        {/* CoverImageInput manages its own hidden input for imagePath */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none after:content-['*'] after:ml-0.5 after:text-destructive">
            Image
          </label>
          <CoverImageInput
            name="imagePath"
            kind="gallery"
            defaultPath={image?.imagePath ?? null}
            aspect="landscape"
            required
          />
        </div>

        <ResourceForm.Field
          name="alt"
          label="Alt text"
          description="Describe the image for screen readers and SEO. Required."
          required
        >
          <ResourceForm.TextInput
            name="alt"
            placeholder="e.g. Bartender pouring a craft beer on tap"
            maxLength={200}
          />
        </ResourceForm.Field>
      </ResourceForm.Section>

      <ResourceForm.Section title="Metadata">
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none">Tags</label>
          <p className="text-xs text-muted-foreground">
            Tag this image for filtering. Press Enter or comma to add.
          </p>
          <TagInput
            name="tags"
            defaultValue={image?.tags ?? []}
            suggestions={props.tagSuggestions ?? []}
          />
        </div>

        <ResourceForm.Field
          name="sortOrder"
          label="Sort order"
          description="Images with a lower number appear first."
        >
          <ResourceForm.TextInput
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            className="w-32"
          />
        </ResourceForm.Field>
      </ResourceForm.Section>
    </ResourceForm>
  );
}
