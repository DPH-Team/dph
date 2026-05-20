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
  date,
  time,
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

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

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

// ─── hours_overrides ──────────────────────────────────────────────────────────
//
// Date-keyed overrides that the public site overlays on weekly defaults.
// No foreign keys to other domain tables; one row per calendar date.
// created_by / updated_by → auth.users(id) are hand-written FKs in the SQL
// migration — Drizzle cannot cross-reference the auth schema.

export const hoursOverrides = pgTable(
  'hours_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date', { mode: 'string' }).notNull().unique(),
    closed: boolean('closed').notNull().default(false),
    openTime: time('open_time'),
    closeTime: time('close_time'),
    note: text('note'),
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
    index('hours_overrides_date_idx').on(t.date),
    check(
      'hours_overrides_times_consistent_check',
      sql`(${t.closed} = true AND ${t.openTime} IS NULL AND ${t.closeTime} IS NULL) OR (${t.closed} = false AND ${t.openTime} IS NOT NULL AND ${t.closeTime} IS NOT NULL)`,
    ),
    check(
      'hours_overrides_note_length_check',
      sql`char_length(${t.note}) <= 200`,
    ),
  ],
);

export type HoursOverride = InferSelectModel<typeof hoursOverrides>;
export type NewHoursOverride = InferInsertModel<typeof hoursOverrides>;

// ─── weekly_hours ─────────────────────────────────────────────────────────────
//
// Exactly 7 rows, one per day-of-week. day_of_week is the natural primary key.
// No created_at / created_by — rows are seeded by migration and only ever updated.
// updated_by references auth.users(id) on delete set null (hand-written FK in SQL
// migration — Drizzle cannot cross-reference the auth schema).

export const weeklyHours = pgTable(
  'weekly_hours',
  {
    dayOfWeek: dayOfWeekEnum('day_of_week').primaryKey(),
    closed: boolean('closed').notNull().default(false),
    openTime: time('open_time'),
    closeTime: time('close_time'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    check(
      'weekly_hours_times_consistent_check',
      sql`(${t.closed} = true AND ${t.openTime} IS NULL AND ${t.closeTime} IS NULL) OR (${t.closed} = false AND ${t.openTime} IS NOT NULL AND ${t.closeTime} IS NOT NULL)`,
    ),
  ],
);

export type WeeklyHourRow = InferSelectModel<typeof weeklyHours>;
export type NewWeeklyHourRow = InferInsertModel<typeof weeklyHours>;

// ─── content_blocks ───────────────────────────────────────────────────────────
//
// One row per named content block; PK = key (text).  No uuid id column — the
// key itself is the stable natural identifier.
// value stores typed JSON validated at the application layer via zod schemas.
// updated_by references auth.users(id) on delete set null (hand-written FK in
// the RLS migration — Drizzle cannot cross-reference the auth schema).

export const BLOCK_KEYS = ['home_hero', 'home_callouts', 'about_body'] as const;

export const contentBlocks = pgTable(
  'content_blocks',
  {
    key: text('key').primaryKey(),
    value: jsonb('value').notNull().default(sql`'{}'::jsonb`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    check(
      'content_blocks_key_check',
      sql`${t.key} IN ('home_hero', 'home_callouts', 'about_body')`,
    ),
  ],
);

export type ContentBlock = InferSelectModel<typeof contentBlocks>;
export type NewContentBlock = InferInsertModel<typeof contentBlocks>;

