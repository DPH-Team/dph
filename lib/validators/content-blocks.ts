import { z } from 'zod';

// ─── Key registry ─────────────────────────────────────────────────────────────

export const CONTENT_BLOCK_KEYS = [
  'home_hero',
  'home_callouts',
  'about_body',
] as const;

export type ContentBlockKey = (typeof CONTENT_BLOCK_KEYS)[number];

// ─── Shared field helpers ─────────────────────────────────────────────────────

/**
 * href must be either a relative path starting with "/" or a full URL with
 * http / https scheme.  Empty string is accepted (treated as absent by callers).
 */
const hrefSchema = z
  .string()
  .max(2000, 'href must be 2 000 characters or fewer')
  .refine(
    (v) =>
      v === '' ||
      v.startsWith('/') ||
      /^https?:\/\//.test(v),
    'href must be a relative path (starting with /) or a full URL (http/https)',
  );

// ─── HomeHeroSchema ───────────────────────────────────────────────────────────

export const HomeHeroSchema = z.object({
  eyebrow: z.string().max(80, 'eyebrow must be 80 characters or fewer').trim(),
  headline: z
    .string()
    .min(1, 'headline is required')
    .max(120, 'headline must be 120 characters or fewer')
    .trim(),
  lead: z
    .string()
    .min(1, 'lead is required')
    .max(400, 'lead must be 400 characters or fewer')
    .trim(),
  primaryCta: z.object({
    label: z
      .string()
      .min(1, 'CTA label is required')
      .max(40, 'CTA label must be 40 characters or fewer')
      .trim(),
    href: hrefSchema,
  }),
  secondaryCta: z.object({
    label: z
      .string()
      .min(1, 'CTA label is required')
      .max(40, 'CTA label must be 40 characters or fewer')
      .trim(),
    href: hrefSchema,
  }),
  imageUrl: z.string().url('imageUrl must be a valid URL').nullable(),
});

export type HomeHeroValue = z.infer<typeof HomeHeroSchema>;

// ─── AboutBodySchema ──────────────────────────────────────────────────────────

export const AboutBodySchema = z.object({
  headline: z
    .string()
    .min(1, 'headline is required')
    .max(120, 'headline must be 120 characters or fewer')
    .trim(),
  lead: z
    .string()
    .min(1, 'lead is required')
    .max(400, 'lead must be 400 characters or fewer')
    .trim(),
  paragraphs: z
    .array(
      z
        .string()
        .min(1, 'paragraph must not be empty')
        .max(2000, 'paragraph must be 2 000 characters or fewer')
        .trim(),
    )
    .min(1, 'at least one paragraph is required')
    .max(20, 'at most 20 paragraphs are supported'),
  rfidSteps: z
    .array(
      z.object({
        icon: z.string().max(40).trim(),
        label: z
          .string()
          .min(1)
          .max(80, 'step label must be 80 characters or fewer')
          .trim(),
        description: z
          .string()
          .max(300, 'step description must be 300 characters or fewer')
          .trim(),
      }),
    )
    .min(1)
    .max(6),
  values: z
    .array(
      z.object({
        title: z
          .string()
          .min(1)
          .max(80, 'value title must be 80 characters or fewer')
          .trim(),
        description: z
          .string()
          .max(300, 'value description must be 300 characters or fewer')
          .trim(),
        isGameDay: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(12),
});

export type AboutBodyValue = z.infer<typeof AboutBodySchema>;

// ─── HomeCalloutsSchema ───────────────────────────────────────────────────────

export const HomeCalloutItemSchema = z.object({
  eyebrow: z
    .string()
    .max(60, 'eyebrow must be 60 characters or fewer')
    .trim()
    .optional(),
  title: z
    .string()
    .min(1, 'title is required')
    .max(80, 'title must be 80 characters or fewer')
    .trim(),
  body: z
    .string()
    .min(1, 'body is required')
    .max(300, 'body must be 300 characters or fewer')
    .trim(),
  href: hrefSchema.optional(),
  cta: z
    .string()
    .max(40, 'CTA label must be 40 characters or fewer')
    .trim()
    .optional(),
});

export const HomeCalloutsSchema = z
  .array(HomeCalloutItemSchema)
  .min(1, 'at least one callout is required')
  .max(6, 'at most 6 callouts are supported');

export type HomeCalloutsValue = z.infer<typeof HomeCalloutsSchema>;

// ─── Schema map ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CONTENT_BLOCK_SCHEMAS: Record<ContentBlockKey, z.ZodType<any>> = {
  home_hero: HomeHeroSchema,
  home_callouts: HomeCalloutsSchema,
  about_body: AboutBodySchema,
};
