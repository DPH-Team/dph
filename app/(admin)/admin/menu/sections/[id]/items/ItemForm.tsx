'use client';

import type { ActionState } from '@/components/admin/ResourceForm';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { AllergenCheckboxGroup } from '@/components/admin/AllergenCheckboxGroup';
import { PriceCentsInput } from '@/components/admin/PriceCentsInput';
import {
  createMenuItemSchema,
  updateMenuItemSchema,
} from '@/lib/validators/menu';
import type { MenuItem } from '@/lib/db/schema';

interface ItemFormCreateProps {
  mode: 'create';
  sectionId: string;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

interface ItemFormEditProps {
  mode: 'edit';
  sectionId: string;
  item: MenuItem;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

type ItemFormProps = ItemFormCreateProps | ItemFormEditProps;

export function ItemForm(props: ItemFormProps) {
  const isEdit = props.mode === 'edit';
  const item = isEdit ? props.item : null;

  const schema = isEdit ? updateMenuItemSchema : createMenuItemSchema;

  const defaultValues = {
    sectionId: props.sectionId,
    name: item?.name ?? '',
    description: item?.description ?? '',
    priceCents: item?.priceCents ?? 0,
    allergens: (item?.allergens as string[]) ?? [],
    sortOrder: item?.sortOrder ?? 0,
    available: item?.available ?? true,
    imagePath: item?.imagePath ?? '',
  };

  return (
    <ResourceForm
      schema={schema}
      defaultValues={defaultValues}
      action={props.action}
      submitLabel={isEdit ? 'Save changes' : 'Create item'}
      cancelHref={`/admin/menu/sections/${props.sectionId}`}
    >
      {/* Hidden fields */}
      <input type="hidden" name="sectionId" value={props.sectionId} />
      <input type="hidden" name="imagePath" value="" />

      <ResourceForm.Section title="Details">
        <ResourceForm.Field name="name" label="Name" required>
          <ResourceForm.TextInput
            name="name"
            placeholder="e.g. Chicken Wings"
            maxLength={120}
          />
        </ResourceForm.Field>

        <ResourceForm.Field
          name="description"
          label="Description"
          description="Shown under the item name on the public menu"
        >
          <ResourceForm.Textarea
            name="description"
            placeholder="A short description of this item…"
            maxLength={600}
            rows={3}
          />
        </ResourceForm.Field>

        <ResourceForm.Field
          name="priceCents"
          label="Price"
          description="Enter the price in dollars (e.g. 12.50)"
        >
          <PriceCentsInput name="priceCents" />
        </ResourceForm.Field>
      </ResourceForm.Section>

      <ResourceForm.Section title="Allergens">
        <ResourceForm.Field name="allergens" label="Allergens">
          <AllergenCheckboxGroup />
        </ResourceForm.Field>
      </ResourceForm.Section>

      <ResourceForm.Section title="Display">
        <ResourceForm.Field
          name="sortOrder"
          label="Sort order"
          description="Items with a lower number appear first within the section."
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
            description="When off, this item is hidden from the public menu."
          />
        </ResourceForm.Field>
      </ResourceForm.Section>
    </ResourceForm>
  );
}
