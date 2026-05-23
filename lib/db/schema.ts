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

export const inquiryTypeEnum = pgEnum('inquiry_type', [
  'reservation',
  'private_event',
  'press',
  'general',
]);

export const inquiryStatusEnum = pgEnum('inquiry_status', [
  'pending',
  'confirmed',
  'declined',
]);

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

// ─── gallery_images ───────────────────────────────────────────────────────────
//
// One row per uploaded photo in the public gallery.
// image_path is a relative path within the `media` storage bucket,
// e.g. "gallery/<uuid>.webp".
// created_by / updated_by → auth.users(id) are hand-written FKs in the SQL
// migration — Drizzle cannot cross-reference the auth schema.

export const galleryImages = pgTable(
  'gallery_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    imagePath: text('image_path').notNull(),
    alt: text('alt').notNull(),
    tags: text('tags').array().notNull().default(sql`'{}'`),
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
    index('gallery_images_sort_order_created_at_idx').on(t.sortOrder, t.createdAt),
    check(
      'gallery_images_alt_length_check',
      sql`char_length(${t.alt}) between 1 and 200`,
    ),
  ],
);

export type GalleryImage = InferSelectModel<typeof galleryImages>;
export type NewGalleryImage = InferInsertModel<typeof galleryImages>;

// ─── team_members ─────────────────────────────────────────────────────────────
//
// Team member profiles shown on the public About page.
// image_path is nullable — a member may not have a photo yet.
// image_path is a relative path within the `media` storage bucket,
// e.g. "team/<uuid>.webp".
// created_by / updated_by → auth.users(id) are hand-written FKs in the SQL
// migration — Drizzle cannot cross-reference the auth schema.

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    bio: text('bio').notNull().default(''),
    imagePath: text('image_path'),
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
    index('team_members_sort_order_name_idx').on(t.sortOrder, t.name),
    check(
      'team_members_name_length_check',
      sql`char_length(${t.name}) between 1 and 120`,
    ),
    check(
      'team_members_role_length_check',
      sql`char_length(${t.role}) between 1 and 120`,
    ),
    check(
      'team_members_bio_length_check',
      sql`char_length(${t.bio}) <= 1000`,
    ),
  ],
);

export type TeamMember = InferSelectModel<typeof teamMembers>;
export type NewTeamMember = InferInsertModel<typeof teamMembers>;

// ─── inquiries ────────────────────────────────────────────────────────────────
//
// Submitted by anonymous public visitors via the InquiryForm.
// No created_by — the submitter is anonymous.
// updated_by → auth.users(id) on delete set null (hand-written FK in RLS
// migration — Drizzle cannot cross-reference the auth schema).
// handled_at is set when status moves off 'pending'; cleared when it returns.

export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: inquiryTypeEnum('type').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    partySize: integer('party_size'),
    preferredDate: date('preferred_date', { mode: 'string' }),
    preferredTime: time('preferred_time'),
    message: text('message').notNull(),
    consent: boolean('consent').notNull().default(false),
    status: inquiryStatusEnum('status').notNull().default('pending'),
    internalNotes: text('internal_notes'),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    index('inquiries_status_created_at_idx').on(t.status, t.createdAt.desc()),
    index('inquiries_type_idx').on(t.type),
    check(
      'inquiries_name_length_check',
      sql`char_length(${t.name}) between 2 and 80`,
    ),
    check(
      'inquiries_email_length_check',
      sql`char_length(${t.email}) between 1 and 320`,
    ),
    check(
      'inquiries_message_length_check',
      sql`char_length(${t.message}) between 10 and 2000`,
    ),
    check(
      'inquiries_party_size_check',
      sql`${t.partySize} is null or (${t.partySize} >= 1 and ${t.partySize} <= 50)`,
    ),
    check(
      'inquiries_internal_notes_length_check',
      sql`${t.internalNotes} is null or char_length(${t.internalNotes}) <= 4000`,
    ),
  ],
);

export type Inquiry = InferSelectModel<typeof inquiries>;
export type NewInquiry = InferInsertModel<typeof inquiries>;

// ─── career_postings ──────────────────────────────────────────────────────────
//
// Admin-managed job postings shown on the public /careers page.
// created_by / updated_by → auth.users(id) on delete set null (hand-written
// FKs in the RLS migration — Drizzle cannot cross-reference the auth schema).

export const employmentTypeEnum = pgEnum('employment_type', [
  'full_time',
  'part_time',
]);

export const careerPostings = pgTable(
  'career_postings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    type: employmentTypeEnum('type').notNull(),
    department: text('department').notNull(),
    description: text('description').notNull(),
    responsibilities: text('responsibilities').array().notNull().default(sql`'{}'`),
    requirements: text('requirements').array().notNull().default(sql`'{}'`),
    isOpen: boolean('is_open').notNull().default(true),
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
    index('career_postings_sort_order_title_idx').on(t.sortOrder, t.title),
    check(
      'career_postings_title_length_check',
      sql`char_length(${t.title}) between 1 and 120`,
    ),
    check(
      'career_postings_department_length_check',
      sql`char_length(${t.department}) between 1 and 80`,
    ),
    check(
      'career_postings_description_length_check',
      sql`char_length(${t.description}) between 1 and 2000`,
    ),
  ],
);

export type CareerPosting = InferSelectModel<typeof careerPostings>;
export type NewCareerPosting = InferInsertModel<typeof careerPostings>;

// ─── career_applications ──────────────────────────────────────────────────────
//
// Applications submitted by anonymous public visitors via the careers form.
// No created_by — the submitter is anonymous.
// updated_by → auth.users(id) on delete set null (hand-written FK in RLS
// migration — Drizzle cannot cross-reference the auth schema).
// handled_at is stamped when status moves off 'new'; cleared when returned to 'new'.
// posting_id → career_postings(id) ON DELETE SET NULL so deleting a posting
// does not destroy its associated applications.

export const applicationStatusEnum = pgEnum('application_status', [
  'new',
  'reviewed',
  'archived',
]);

export const careerApplications = pgTable(
  'career_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postingId: uuid('posting_id'),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    message: text('message').notNull(),
    resumePath: text('resume_path'),
    status: applicationStatusEnum('status').notNull().default('new'),
    internalNotes: text('internal_notes'),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    consent: boolean('consent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    index('career_applications_status_created_at_idx').on(
      t.status,
      t.createdAt.desc(),
    ),
    index('career_applications_posting_id_idx').on(t.postingId),
    index('career_applications_email_idx').on(t.email),
    check(
      'career_applications_name_length_check',
      sql`char_length(${t.name}) between 2 and 80`,
    ),
    check(
      'career_applications_email_length_check',
      sql`char_length(${t.email}) between 1 and 320`,
    ),
    check(
      'career_applications_message_length_check',
      sql`char_length(${t.message}) between 10 and 4000`,
    ),
    check(
      'career_applications_internal_notes_length_check',
      sql`${t.internalNotes} is null or char_length(${t.internalNotes}) <= 4000`,
    ),
  ],
);

export type CareerApplication = InferSelectModel<typeof careerApplications>;
export type NewCareerApplication = InferInsertModel<typeof careerApplications>;

// ─── subscribers ──────────────────────────────────────────────────────────────
//
// Newsletter subscriber list. Soft-unsubscribe via unsubscribed_at (null = active).
// Email stored lowercased and enforced by DB check + zod validator.
// No created_by — public anonymous inserts via anon policy.
// updated_by → auth.users(id) on delete set null (hand-written FK in RLS
// migration — Drizzle cannot cross-reference the auth schema).
// source is a free-text provenance label: 'public_form', 'manual', etc.
// Phase 7 will wire the public form; the anon INSERT policy is already set up.

export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    source: text('source').notNull().default('public_form'),
    subscribedAt: timestamp('subscribed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (t) => [
    index('subscribers_subscribed_at_idx').on(t.subscribedAt.desc()),
    index('subscribers_active_idx')
      .on(t.subscribedAt.desc())
      .where(sql`${t.unsubscribedAt} is null`),
    check(
      'subscribers_email_length_check',
      sql`char_length(${t.email}) between 3 and 320`,
    ),
    check(
      'subscribers_email_format_check',
      sql`${t.email} ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'`,
    ),
    check(
      'subscribers_email_lowercase_check',
      sql`${t.email} = lower(${t.email})`,
    ),
  ],
);

export type Subscriber = InferSelectModel<typeof subscribers>;
export type NewSubscriber = InferInsertModel<typeof subscribers>;

