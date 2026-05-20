import 'server-only';

import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { galleryImages } from '@/lib/db/schema';
import type { GalleryImage, NewGalleryImage } from '@/lib/db/schema';

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List all gallery images ordered by (sort_order ASC, created_at ASC).
 */
export async function listGalleryImages(): Promise<GalleryImage[]> {
  return db
    .select()
    .from(galleryImages)
    .orderBy(asc(galleryImages.sortOrder), asc(galleryImages.createdAt));
}

// ─── Get by id ────────────────────────────────────────────────────────────────

/**
 * Get a single gallery image by id. Returns null if not found.
 */
export async function getGalleryImageById(id: string): Promise<GalleryImage | null> {
  const rows = await db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Insert a new gallery image. Returns the created row.
 */
export async function createGalleryImage(
  input: Omit<NewGalleryImage, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  actorId: string,
): Promise<GalleryImage> {
  const rows = await db
    .insert(galleryImages)
    .values({ ...input, createdBy: actorId, updatedBy: actorId })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error('createGalleryImage: insert returned no rows');
  }
  return row;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update a gallery image by id. Returns the updated row.
 * Throws if the row does not exist.
 */
export async function updateGalleryImage(
  id: string,
  input: Partial<Omit<NewGalleryImage, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>,
  actorId: string,
): Promise<GalleryImage> {
  const rows = await db
    .update(galleryImages)
    .set({ ...input, updatedBy: actorId, updatedAt: new Date() })
    .where(eq(galleryImages.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`updateGalleryImage: no gallery image found with id ${id}`);
  }
  return row;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Hard-delete a gallery image by id.
 * Returns the deleted row's image_path so the calling action can clean up storage.
 * Returns null if the row did not exist.
 */
export async function deleteGalleryImage(
  id: string,
  actorId: string,
): Promise<{ imagePath: string } | null> {
  void actorId; // actor is recorded in the audit log by the action layer
  const rows = await db
    .delete(galleryImages)
    .where(eq(galleryImages.id, id))
    .returning({ imagePath: galleryImages.imagePath });
  return rows[0] ?? null;
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Bulk-reindex gallery images according to the provided ordered ID array.
 * Each image's sort_order is set to its index (0-based) in the array.
 * Runs in a transaction; writes updated_at and updated_by on every touched row.
 */
export async function reorderGalleryImages(
  orderedIds: string[],
  actorId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(galleryImages)
        .set({
          sortOrder: i,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(galleryImages.id, orderedIds[i]!));
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the current ordered list of image IDs (sort_order ASC, created_at ASC).
 * Used by the reorder action to capture the "before" snapshot for the audit log.
 */
export async function getGalleryImageIds(): Promise<string[]> {
  const rows = await db
    .select({ id: galleryImages.id })
    .from(galleryImages)
    .orderBy(asc(galleryImages.sortOrder), asc(galleryImages.createdAt));
  return rows.map((r) => r.id);
}
