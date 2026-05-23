import { z } from 'zod';

// ─── List filter schema ───────────────────────────────────────────────────────

/**
 * Query filters for the admin activity log list view.
 * All fields are optional; absent fields mean "no filter applied".
 */
export const listAuditFilterSchema = z.object({
  actor: z.string().trim().min(1).max(200).optional(),
  action: z.string().trim().min(1).max(120).optional(),
  entityType: z.string().trim().min(1).max(120).optional(),
  // ISO date strings — validated as YYYY-MM-DD
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export type ListAuditFilterInput = z.infer<typeof listAuditFilterSchema>;
