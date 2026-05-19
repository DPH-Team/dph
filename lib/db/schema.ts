import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  bigint,
  integer,
  customType,
  check,
  index,
  unique,
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

// ─── menu_sections ────────────────────────────────────────────────────────────
//
// Top-level groupings for menu items (e.g. "Starters", "Mains", "Desserts").
// created_by / updated_by → auth.users(id) are hand-written FKs in the SQL
// migration — Drizzle cannot cross-reference the auth schema.

export const menuSections = pgTable(
  'menu_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    available: boolean('available').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    index('menu_sections_sort_order_name_idx').on(t.sortOrder, t.name),
    check(
      'menu_sections_name_length_check',
      sql`char_length(${t.name}) between 1 and 80`,
    ),
  ],
);

export type MenuSection = InferSelectModel<typeof menuSections>;
export type NewMenuSection = InferInsertModel<typeof menuSections>;

// ─── menu_items ───────────────────────────────────────────────────────────────
//
// Individual items within a section.
// section_id → menu_sections(id) ON DELETE RESTRICT (deleting a section that
// still has items errors; translate in the action layer).
// created_by / updated_by → auth.users(id) are hand-written FKs in the SQL
// migration.

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => menuSections.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    priceCents: integer('price_cents').notNull(),
    allergens: text('allergens').array().notNull().default(sql`'{}'`),
    imagePath: text('image_path'),
    available: boolean('available').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    index('menu_items_section_sort_idx').on(t.sectionId, t.sortOrder),
    index('menu_items_available_idx').on(t.available),
    check(
      'menu_items_name_length_check',
      sql`char_length(${t.name}) between 1 and 120`,
    ),
    check(
      'menu_items_description_length_check',
      sql`char_length(${t.description}) <= 600`,
    ),
    check(
      'menu_items_price_cents_check',
      sql`${t.priceCents} >= 0 and ${t.priceCents} <= 100000`,
    ),
    check(
      'menu_items_allergens_check',
      sql`${t.allergens} <@ ARRAY['gluten','dairy','nuts','shellfish','egg','soy']::text[]`,
    ),
  ],
);

export type MenuItem = InferSelectModel<typeof menuItems>;
export type NewMenuItem = InferInsertModel<typeof menuItems>;

