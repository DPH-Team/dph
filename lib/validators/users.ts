import { z } from 'zod';

// ─── Role constants ────────────────────────────────────────────────────────────

export const APP_ROLES = ['admin', 'staff'] as const;
export type AppRole = (typeof APP_ROLES)[number];

// ─── Create user schema ───────────────────────────────────────────────────────

/**
 * Validates the payload for creating a new staff/admin account.
 * Password minimum is 10 to force a reasonably strong temp password.
 * Emails are lowercased and trimmed; they must still be changed by the user
 * (the account is flagged must_change_password = true via app_metadata).
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address.')
    .toLowerCase()
    .trim()
    .max(320, 'Email must be 320 characters or fewer.'),
  password: z
    .string()
    .min(10, 'Temporary password must be at least 10 characters.')
    .max(72, 'Password must be 72 characters or fewer.'),
  fullName: z
    .string()
    .trim()
    .max(120, 'Name must be 120 characters or fewer.')
    .optional(),
  role: z.enum(APP_ROLES, {
    error: 'Role must be admin or staff.',
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ─── Update role schema ────────────────────────────────────────────────────────

export const updateRoleSchema = z.object({
  role: z.enum(APP_ROLES, {
    error: 'Role must be admin or staff.',
  }),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ─── Set status schema ────────────────────────────────────────────────────────

export const setStatusSchema = z.object({
  action: z.enum(['disable', 'enable'], {
    error: 'Action must be disable or enable.',
  }),
});

export type SetStatusInput = z.infer<typeof setStatusSchema>;

// ─── Change own password schema ───────────────────────────────────────────────

export const changeOwnPasswordSchema = z.object({
  password: z
    .string()
    .min(10, 'New password must be at least 10 characters.')
    .max(72, 'Password must be 72 characters or fewer.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;

// ─── User list filter schema ──────────────────────────────────────────────────

export const listUsersFilterSchema = z.object({
  role: z.enum([...APP_ROLES, 'all'] as [string, ...string[]]).optional(),
  status: z.enum(['active', 'disabled', 'all'] as [string, ...string[]]).optional(),
  search: z.string().trim().optional(),
});

export type ListUsersFilterInput = z.infer<typeof listUsersFilterSchema>;
