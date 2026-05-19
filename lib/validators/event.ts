import { z } from 'zod';

export const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createEventSchema = z
  .object({
    /**
     * Optional: if the client generates a UUID up-front (for cover image path
     * namespacing before the row exists), it can be forwarded here.  The server
     * action passes it through to createEvent so the image path and the DB row
     * share the same id.  When absent the DB generates a random UUID.
     */
    id: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required').max(200).trim(),
    slug: z
      .string()
      .min(1)
      .max(160)
      .regex(slugRe, 'Lowercase letters, numbers, and hyphens only')
      .trim(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().nullable().optional(),
    descriptionMd: z.string().max(20000).default(''),
    coverImagePath: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v === '' || v == null ? null : v)),
    coverImageAlt: z.string().max(200).default(''),
    ticketUrl: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v === '' || v == null ? null : v))
      .pipe(z.string().url().nullable()),
    featured: z.boolean().default(false),
    published: z.boolean().default(false),
  })
  .refine((v) => !v.endsAt || v.endsAt > v.startsAt, {
    message: 'End must be after start',
    path: ['endsAt'],
  });

export const updateEventSchema = createEventSchema;

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
