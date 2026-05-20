import { z } from 'zod';
import { imagePathSchema } from './gallery';

// ─── Team member schemas ──────────────────────────────────────────────────────

// Re-export so callers can import imagePathSchema from either validator module.
export { imagePathSchema };

export const teamMemberCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer')
    .trim(),
  role: z
    .string()
    .min(1, 'Role is required')
    .max(120, 'Role must be 120 characters or fewer')
    .trim(),
  bio: z
    .string()
    .max(1000, 'Bio must be 1000 characters or fewer')
    .trim()
    .default(''),
  /** image_path is optional at creation time — photo can be added later. */
  imagePath: imagePathSchema.optional().nullable(),
  sortOrder: z
    .coerce.number()
    .int()
    .min(0, 'Sort order must be 0 or greater')
    .default(0),
});

export const teamMemberUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer')
    .trim()
    .optional(),
  role: z
    .string()
    .min(1, 'Role is required')
    .max(120, 'Role must be 120 characters or fewer')
    .trim()
    .optional(),
  bio: z
    .string()
    .max(1000, 'Bio must be 1000 characters or fewer')
    .trim()
    .optional(),
  imagePath: imagePathSchema.optional().nullable(),
  sortOrder: z
    .coerce.number()
    .int()
    .min(0, 'Sort order must be 0 or greater')
    .optional(),
});

export const teamReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
});

export type TeamMemberCreateInput = z.infer<typeof teamMemberCreateSchema>;
export type TeamMemberUpdateInput = z.infer<typeof teamMemberUpdateSchema>;
export type TeamReorderInput = z.infer<typeof teamReorderSchema>;
