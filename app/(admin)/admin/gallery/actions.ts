'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import {
  galleryImageCreateSchema,
  galleryImageUpdateSchema,
  galleryReorderSchema,
} from '@/lib/validators/gallery';
import {
  getGalleryImageById,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  getGalleryImageIds,
} from '@/lib/db/queries/gallery';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';
import { deleteObject } from '@/lib/supabase/storage';
import type { ActionState } from '@/lib/types/action-state';

// ─── Revalidation helper ──────────────────────────────────────────────────────

function revalidateGallery() {
  revalidateTag('gallery', 'max');
  revalidatePath('/admin/gallery');
  revalidatePath('/gallery');
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new gallery image record after the file has been uploaded via the
 * signed-upload route. The image_path comes from the upload response.
 */
export async function createGalleryImageAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  let tags: string[] = [];
  const tagsRaw = formData.get('tags');
  if (typeof tagsRaw === 'string' && tagsRaw) {
    try {
      const parsed = JSON.parse(tagsRaw);
      tags = Array.isArray(parsed) ? parsed : [];
    } catch {
      tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
    }
  }

  const raw = {
    imagePath: formData.get('imagePath'),
    alt: formData.get('alt'),
    tags,
    sortOrder: Number(formData.get('sortOrder') ?? 0),
  };

  const result = galleryImageCreateSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let image;
  try {
    image = await createGalleryImage(
      {
        imagePath: data.imagePath,
        alt: data.alt,
        tags: data.tags,
        sortOrder: data.sortOrder,
      },
      profile.id,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to create gallery image: ${msg}` };
  }

  await auditCreate(
    'gallery_image',
    image.id,
    image as unknown as Record<string, unknown>,
  );

  revalidateGallery();

  redirect('/admin/gallery');
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing gallery image's metadata.
 * If image_path is replaced, best-effort deletes the old object from storage.
 */
export async function updateGalleryImageAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getGalleryImageById(id);
  if (!before) {
    return { ok: false, error: 'Gallery image not found.' };
  }

  let tags: string[] = [];
  const tagsRaw = formData.get('tags');
  if (typeof tagsRaw === 'string' && tagsRaw) {
    try {
      const parsed = JSON.parse(tagsRaw);
      tags = Array.isArray(parsed) ? parsed : [];
    } catch {
      tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
    }
  }

  const raw = {
    imagePath: formData.get('imagePath') || undefined,
    alt: formData.get('alt') || undefined,
    tags: tagsRaw != null ? tags : undefined,
    sortOrder: formData.has('sortOrder')
      ? Number(formData.get('sortOrder'))
      : undefined,
  };

  const result = galleryImageUpdateSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = result.data;

  let image;
  try {
    image = await updateGalleryImage(id, data, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update gallery image: ${msg}` };
  }

  // Best-effort: remove the old storage object when image_path was replaced
  if (data.imagePath && data.imagePath !== before.imagePath) {
    try {
      await deleteObject({ bucket: 'media', path: before.imagePath });
    } catch (err) {
      console.error(
        '[gallery] Failed to delete old storage object after image_path update:',
        { id, oldPath: before.imagePath, error: err },
      );
    }
  }

  await auditUpdate(
    'gallery_image',
    id,
    before as unknown as Record<string, unknown>,
    image as unknown as Record<string, unknown>,
  );

  revalidateGallery();

  return { ok: true, id: image.id };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a gallery image record and best-effort remove its storage object.
 */
export async function deleteGalleryImageAction(
  id: string,
): Promise<ActionState> {
  const profile = await requireStaff();

  const before = await getGalleryImageById(id);
  if (!before) {
    return { ok: false, error: 'Gallery image not found.' };
  }

  let deleted;
  try {
    deleted = await deleteGalleryImage(id, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete gallery image: ${msg}` };
  }

  // Best-effort: remove from storage
  if (deleted?.imagePath) {
    try {
      await deleteObject({ bucket: 'media', path: deleted.imagePath });
    } catch (err) {
      console.error(
        '[gallery] Failed to delete storage object after gallery image deletion:',
        { id, path: deleted.imagePath, error: err },
      );
    }
  }

  await auditDelete(
    'gallery_image',
    id,
    before as unknown as Record<string, unknown>,
  );

  revalidateGallery();

  return { ok: true };
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Reorder gallery images by persisting a new sort_order for each id in the
 * provided array. Writes ONE audit-log row capturing the before/after id order.
 */
export async function reorderGalleryImagesAction(
  orderedIds: string[],
): Promise<ActionState> {
  const profile = await requireStaff();

  const result = galleryReorderSchema.safeParse({ orderedIds });
  if (!result.success) {
    return {
      ok: false,
      error: 'Invalid reorder payload.',
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Capture current order for the audit log
  const prevOrderedIds = await getGalleryImageIds();

  try {
    await reorderGalleryImages(result.data.orderedIds, profile.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to reorder gallery images: ${msg}` };
  }

  await auditCreate(
    'gallery_image',
    'reorder',
    {},
    {
      action: 'gallery.reorder',
      before: prevOrderedIds,
      after: result.data.orderedIds,
    },
  );

  revalidateGallery();

  return { ok: true };
}
