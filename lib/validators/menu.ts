import { z } from 'zod';

// ─── Allergen constants ───────────────────────────────────────────────────────

/**
 * Closed list of recognised allergen identifiers.
 * Exported as a const tuple so the admin form can derive UI options from it.
 */
export const ALLERGENS = [
  'gluten',
  'dairy',
  'nuts',
  'shellfish',
  'egg',
  'soy',
] as const;

export type Allergen = (typeof ALLERGENS)[number];

// ─── Slug regex ───────────────────────────────────────────────────────────────

/**
 * Matches the output of lib/slugify: lowercase letters, digits, hyphens,
 * no leading or trailing hyphen.
 */
export const menuSlugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ─── Section schemas ──────────────────────────────────────────────────────────

export const createMenuSectionSchema = z.object({
  /** Optional: if omitted, the server derives the slug from name via slugify. */
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(80, 'Name must be 80 characters or fewer')
    .trim(),
  slug: z
    .preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z
        .string()
        .min(1)
        .max(80)
        .regex(menuSlugRe, 'Slug must be lowercase letters, digits, and hyphens only')
        .trim()
        .optional(),
    ),
  description: z
    .string()
    .max(600, 'Description must be 600 characters or fewer')
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  sortOrder: z
    .coerce.number()
    .int()
    .min(0, 'Sort order must be 0 or greater')
    .default(0),
  available: z.boolean().default(true),
  showPrices: z.boolean().default(true),
});

export const updateMenuSectionSchema = createMenuSectionSchema;

export type CreateMenuSectionInput = z.infer<typeof createMenuSectionSchema>;
export type UpdateMenuSectionInput = z.infer<typeof updateMenuSectionSchema>;

// ─── Item schemas ─────────────────────────────────────────────────────────────

const allergenEnum = z.enum(ALLERGENS);

export const createMenuItemSchema = z.object({
  /** Optional: reserved for future symmetry with create-then-upload flow. */
  id: z.string().uuid().optional(),
  sectionId: z.string().uuid({ message: 'A valid section ID is required' }),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer')
    .trim(),
  description: z
    .string()
    .max(600, 'Description must be 600 characters or fewer')
    .trim()
    .default(''),
  priceCents: z
    .coerce.number()
    .int()
    .min(0, 'Price cannot be negative')
    .max(100000, 'Price cannot exceed $1,000.00'),
  allergens: z
    .array(allergenEnum)
    .default([]),
  imagePath: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  available: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  sortOrder: z
    .coerce.number()
    .int()
    .min(0, 'Sort order must be 0 or greater')
    .default(0),
});

export const updateMenuItemSchema = createMenuItemSchema;

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
