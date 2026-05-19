import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  bigint,
  customType,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ─── Custom types ────────────────────────────────────────────────────────────

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return 'bytea';
  },
});

const inet = customType<{ data: string; notNull: false; default: false }>({
  dataType() {
    return 'inet';
  },
});

// ─── Enums ───────────────────────────────────────────────────────────────────

export const appRoleEnum = pgEnum('app_role', ['admin', 'staff']);

// ─── profiles ────────────────────────────────────────────────────────────────
//
// Mirror of auth.users — created automatically by handle_new_auth_user trigger.
// id references auth.users(id) on delete cascade (enforced in SQL migration).
// Drizzle does not know about auth schema, so the FK is hand-written.

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  role: appRoleEnum('role').notNull().default('staff'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

// ─── audit_log ───────────────────────────────────────────────────────────────
//
// Append-only. Writes only via service-role client (RLS denies user writes).
// actor_id references auth.users(id) on delete set null (hand-written FK).

export const auditLog = pgTable('audit_log', {
  id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  actorId: uuid('actor_id'),
  actorEmail: text('actor_email'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  diff: jsonb('diff'),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'),
});

export type AuditLogEntry = InferSelectModel<typeof auditLog>;
export type NewAuditLogEntry = InferInsertModel<typeof auditLog>;

// ─── integrations ─────────────────────────────────────────────────────────────
//
// One row per integration, PK = name. Seeded by migration.
// Credentials stored encrypted (bytea). Use set_integration_credentials()
// and get_integration_credentials() SQL functions to encrypt/decrypt.
// updated_by references auth.users(id) on delete set null (hand-written FK).

export const integrations = pgTable(
  'integrations',
  {
    name: text('name').primaryKey(),
    enabled: boolean('enabled').notNull().default(false),
    mode: text('mode').notNull().default('mock'),
    credentials: bytea('credentials').notNull().default(sql`'\\x'::bytea`),
    config: jsonb('config').notNull().default(sql`'{}'::jsonb`),
    lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
    lastTestStatus: text('last_test_status'),
    lastTestError: text('last_test_error'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    check('integrations_name_check', sql`${t.name} IN ('untappd', 'printify')`),
    check('integrations_mode_check', sql`${t.mode} IN ('mock', 'live')`),
  ],
);

export type Integration = InferSelectModel<typeof integrations>;
export type NewIntegration = InferInsertModel<typeof integrations>;

