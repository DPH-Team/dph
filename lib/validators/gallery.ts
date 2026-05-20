import { z } from 'zod';

// ─── Shared image path schema ─────────────────────────────────────────────────

/**
 * Validates a storage-relative image path for both gallery and team surfaces.
 * Format: "{gallery|team}/{uuid}.{ext}"
 * The UUID segment is the Supabase crypto.randomUUID() output (hex + hyphens).
 */
export const imagePathSchema = z
  .string()
  .regex(
    /^(gallery|team)\/[0-9a-f-]{36}\.(jpe?g|png|webp|avif)$/i,
    'image_path must be in the format gallery/<uuid>.<ext> or team/<uuid>.<ext>',
  );

// ─── Tags schema (shared) ─────────────────────────────────────────────────────

export const tagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .default([]);

// ─── Gallery image schemas ────────────────────────────────────────────────────

export const galleryImageCreateSchema = z.object({
  imagePath: imagePathSchema,
  alt: z
    .string()
    .min(1, 'Alt text is required')
    .max(200, 'Alt text must be 200 characters or fewer')
    .trim(),
  tags: tagsSchema,
  sortOrder: z
    .coerce.number()
    .int()
    .min(0, 'Sort order must be 0 or greater')
    .default(0),
});

export const galleryImageUpdateSchema = z.object({
  imagePath: imagePathSchema.optional(),
  alt: z
    .string()
    .min(1, 'Alt text is required')
    .max(200, 'Alt text must be 200 characters or fewer')
    .trim()
    .optional(),
  tags: tagsSchema.optional(),
  sortOrder: z
    .coerce.number()
    .int()
    .min(0, 'Sort order must be 0 or greater')
    .optional(),
});

export const galleryReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
});

export type GalleryImageCreateInput = z.infer<typeof galleryImageCreateSchema>;
export type GalleryImageUpdateInput = z.infer<typeof galleryImageUpdateSchema>;
export type GalleryReorderInput = z.infer<typeof galleryReorderSchema>;
