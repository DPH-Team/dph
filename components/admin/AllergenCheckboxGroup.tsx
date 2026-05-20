'use client';

import { useFormContext } from 'react-hook-form';
import { ALLERGENS, type Allergen } from '@/lib/validators/menu';

const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  dairy: 'Dairy',
  nuts: 'Nuts',
  shellfish: 'Shellfish',
  egg: 'Egg',
  soy: 'Soy',
};

/**
 * AllergenCheckboxGroup — controlled checkbox group for menu item allergens.
 *
 * Uses useFormContext to read/write the `allergens` field in react-hook-form.
 * Emits a hidden input with the JSON-encoded array so the server action can
 * read `formData.get('allergens')` and JSON.parse it.
 *
 * Wrap in <ResourceForm.Field name="allergens" label="Allergens"> at the
 * call-site.
 */
export function AllergenCheckboxGroup() {
  const { watch, setValue } = useFormContext();
  const selected: Allergen[] = watch('allergens') ?? [];

  function toggle(allergen: Allergen) {
    if (selected.includes(allergen)) {
      setValue(
        'allergens',
        selected.filter((a) => a !== allergen),
        { shouldDirty: true },
      );
    } else {
      setValue('allergens', [...selected, allergen], { shouldDirty: true });
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Allergens</legend>
      {/* Hidden input carries the JSON array into FormData */}
      <input
        type="hidden"
        name="allergens"
        value={JSON.stringify(selected)}
      />
      <div className="flex flex-wrap gap-3">
        {ALLERGENS.map((allergen) => {
          const checked = selected.includes(allergen);
          const id = `allergen-${allergen}`;
          return (
            <label
              key={allergen}
              htmlFor={id}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={() => toggle(allergen)}
                className="size-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm text-foreground">
                {ALLERGEN_LABELS[allergen]}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
