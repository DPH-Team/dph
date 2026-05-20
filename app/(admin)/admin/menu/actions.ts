'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import {
  createMenuSectionSchema,
  updateMenuSectionSchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from '@/lib/validators/menu';
import { slugify } from '@/lib/slugify';
import {
  listSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  MenuSectionHasItemsError,
} from '@/lib/db/queries/menu';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';
import type { ActionState } from '@/lib/types/action-state';

// ─── Revalidation helpers ─────────────────────────────────────────────────────

function revalidateMenuPublic() {
  revalidateTag('menu', 'pages');
  revalidatePath('/menu');
}

function revalidateSectionAdmin(sectionId: string) {
  revalidatePath(`/admin/menu/sections/${sectionId}`);
}

// ─── Section actions ──────────────────────────────────────────────────────────

/**
 * Create a new menu section.
 * On success redirects to /admin/menu/sections/[newId].
 */
export async function createMenuSectionAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    description: formData.get('description') || null,
    sortOrder: Number(formData.get('sortOrder') ?? 0),
    available: formData.get('available') === 'true',
  };

  const result = createMenuSectionSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  // Derive slug from name if not provided
  const slug = data.slug ?? slugify(data.name);

  let section;
  try {
    section = await createSection({
      name: data.name,
      slug,
      description: data.description ?? null,
      sortOrder: data.sortOrder,
      available: data.available,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // Surface duplicate slug as a field error
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return {
        ok: false,
        error: 'Please correct the errors below.',
        fieldErrors: { slug: ['This slug is already taken. Choose a different one.'] },
      };
    }
    return { ok: false, error: `Failed to create section: ${msg}` };
  }

  await auditCreate(
    'menu_section',
    section.id,
    section as unknown as Record<string, unknown>,
  );

  revalidateMenuPublic();
  revalidatePath('/admin/menu');

  redirect(`/admin/menu/sections/${section.id}`);
}

/**
 * Update an existing menu section.
 */
export async function updateMenuSectionAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getSectionById(id);
  if (!before) {
    return { ok: false, error: 'Section not found.' };
  }

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug') || undefined,
    description: formData.get('description') || null,
    sortOrder: Number(formData.get('sortOrder') ?? 0),
    available: formData.get('available') === 'true',
  };

  const result = updateMenuSectionSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;
  const slug = data.slug ?? slugify(data.name);

  let section;
  try {
    section = await updateSection(id, {
      name: data.name,
      slug,
      description: data.description ?? null,
      sortOrder: data.sortOrder,
      available: data.available,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return {
        ok: false,
        error: 'Please correct the errors below.',
        fieldErrors: { slug: ['This slug is already taken. Choose a different one.'] },
      };
    }
    return { ok: false, error: `Failed to update section: ${msg}` };
  }

  await auditUpdate(
    'menu_section',
    id,
    before as unknown as Record<string, unknown>,
    section as unknown as Record<string, unknown>,
  );

  revalidateMenuPublic();
  revalidatePath('/admin/menu');
  revalidateSectionAdmin(id);

  return { ok: true, id: section.id };
}

/**
 * Delete a menu section.
 * Returns a friendly error if the section still has items (FK restrict).
 * On success redirects to /admin/menu.
 */
export async function deleteMenuSectionAction(
  id: string,
): Promise<ActionState> {
  await requireStaff();

  const section = await getSectionById(id);
  if (!section) {
    return { ok: false, error: 'Section not found.' };
  }

  try {
    await deleteSection(id);
  } catch (err) {
    if (err instanceof MenuSectionHasItemsError) {
      return {
        ok: false,
        error: 'This section still has items. Delete or move them first.',
      };
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete section: ${msg}` };
  }

  await auditDelete(
    'menu_section',
    id,
    section as unknown as Record<string, unknown>,
  );

  revalidateMenuPublic();
  revalidatePath('/admin/menu');

  redirect('/admin/menu');
}

// ─── Item actions ─────────────────────────────────────────────────────────────

/**
 * Create a new menu item.
 * On success redirects to /admin/menu/sections/[sectionId].
 */
export async function createMenuItemAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  // Allergens come through as a JSON-encoded array or as multiple fields
  let allergens: string[] = [];
  const allergensRaw = formData.get('allergens');
  if (typeof allergensRaw === 'string' && allergensRaw) {
    try {
      const parsed = JSON.parse(allergensRaw);
      allergens = Array.isArray(parsed) ? parsed : [];
    } catch {
      allergens = allergensRaw ? [allergensRaw] : [];
    }
  }

  const raw = {
    sectionId: formData.get('sectionId'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    priceCents: Number(formData.get('priceCents') ?? 0),
    allergens,
    imagePath: formData.get('imagePath') || null,
    available: formData.get('available') === 'true',
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  };

  const result = createMenuItemSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let item;
  try {
    item = await createItem({
      sectionId: data.sectionId,
      name: data.name,
      description: data.description,
      priceCents: data.priceCents,
      allergens: data.allergens,
      imagePath: data.imagePath ?? null,
      available: data.available,
      sortOrder: data.sortOrder,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to create item: ${msg}` };
  }

  await auditCreate(
    'menu_item',
    item.id,
    item as unknown as Record<string, unknown>,
  );

  revalidateMenuPublic();
  revalidateSectionAdmin(data.sectionId);

  redirect(`/admin/menu/sections/${data.sectionId}`);
}

/**
 * Update an existing menu item.
 */
export async function updateMenuItemAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getItemById(id);
  if (!before) {
    return { ok: false, error: 'Item not found.' };
  }

  let allergens: string[] = [];
  const allergensRaw = formData.get('allergens');
  if (typeof allergensRaw === 'string' && allergensRaw) {
    try {
      const parsed = JSON.parse(allergensRaw);
      allergens = Array.isArray(parsed) ? parsed : [];
    } catch {
      allergens = allergensRaw ? [allergensRaw] : [];
    }
  }

  const raw = {
    sectionId: formData.get('sectionId'),
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    priceCents: Number(formData.get('priceCents') ?? 0),
    allergens,
    imagePath: formData.get('imagePath') || null,
    available: formData.get('available') === 'true',
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  };

  const result = updateMenuItemSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let item;
  try {
    item = await updateItem(id, {
      sectionId: data.sectionId,
      name: data.name,
      description: data.description,
      priceCents: data.priceCents,
      allergens: data.allergens,
      imagePath: data.imagePath ?? null,
      available: data.available,
      sortOrder: data.sortOrder,
      actorId: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update item: ${msg}` };
  }

  await auditUpdate(
    'menu_item',
    id,
    before as unknown as Record<string, unknown>,
    item as unknown as Record<string, unknown>,
  );

  revalidateMenuPublic();
  revalidateSectionAdmin(data.sectionId);
  revalidatePath(`/admin/menu/sections/${data.sectionId}/items/${id}`);

  return { ok: true, id: item.id };
}

/**
 * Delete a menu item.
 * On success redirects to /admin/menu/sections/[sectionId].
 */
export async function deleteMenuItemAction(
  id: string,
): Promise<ActionState> {
  await requireStaff();

  const item = await getItemById(id);
  if (!item) {
    return { ok: false, error: 'Item not found.' };
  }

  const sectionId = item.sectionId;

  try {
    await deleteItem(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete item: ${msg}` };
  }

  await auditDelete(
    'menu_item',
    id,
    item as unknown as Record<string, unknown>,
  );

  revalidateMenuPublic();
  revalidateSectionAdmin(sectionId);

  redirect(`/admin/menu/sections/${sectionId}`);
}

// ─── Convenience re-export ────────────────────────────────────────────────────

export { listSections };
