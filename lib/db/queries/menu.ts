import 'server-only';

import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { menuSections, menuItems } from '@/lib/db/schema';
import type { MenuSection, NewMenuSection, MenuItem, NewMenuItem } from '@/lib/db/schema';

// ─── Error types ──────────────────────────────────────────────────────────────

/**
 * Thrown by deleteSection when the FK restrict constraint fires because the
 * section still has items attached. The action layer catches this and
 * surfaces a friendly message rather than a 500.
 */
export class MenuSectionHasItemsError extends Error {
  constructor(sectionId: string) {
    super(`Section ${sectionId} still has items. Delete or move them first.`);
    this.name = 'MenuSectionHasItemsError';
  }
}

// ─── PG FK restrict error code ────────────────────────────────────────────────

const PG_FK_VIOLATION = '23503';

// ─── Section queries ──────────────────────────────────────────────────────────

export interface ListSectionsOptions {
  includeUnavailable?: boolean;
}

/**
 * List all menu sections, sorted by (sort_order asc, name asc).
 * By default only returns available sections (available = true).
 */
export async function listSections(
  opts: ListSectionsOptions = {},
): Promise<MenuSection[]> {
  const { includeUnavailable = false } = opts;

  const query = db
    .select()
    .from(menuSections)
    .where(includeUnavailable ? undefined : eq(menuSections.available, true))
    .orderBy(asc(menuSections.sortOrder), asc(menuSections.name));

  return query;
}

/**
 * Get a single section by id. Returns null if not found.
 */
export async function getSectionById(id: string): Promise<MenuSection | null> {
  const rows = await db
    .select()
    .from(menuSections)
    .where(eq(menuSections.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Get a single section by slug (case-insensitive). Returns null if not found.
 */
export async function getSectionBySlug(slug: string): Promise<MenuSection | null> {
  const rows = await db
    .select()
    .from(menuSections)
    .where(sql`lower(${menuSections.slug}) = lower(${slug})`)
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Insert a new menu section. Returns the created row.
 */
export async function createSection(
  input: NewMenuSection & { actorId: string },
): Promise<MenuSection> {
  const { actorId, ...rest } = input;
  const rows = await db
    .insert(menuSections)
    .values({ ...rest, createdBy: actorId, updatedBy: actorId })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error('createSection: insert returned no rows');
  }
  return row;
}

/**
 * Update a menu section by id. Returns the updated row.
 * Throws if the row does not exist.
 */
export async function updateSection(
  id: string,
  input: Partial<NewMenuSection> & { actorId: string },
): Promise<MenuSection> {
  const { actorId, ...rest } = input;
  const rows = await db
    .update(menuSections)
    .set({ ...rest, updatedBy: actorId, updatedAt: new Date() })
    .where(eq(menuSections.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`updateSection: no section found with id ${id}`);
  }
  return row;
}

/**
 * Hard-delete a section by id.
 * Throws MenuSectionHasItemsError if the section still has items attached
 * (FK restrict from menu_items.section_id).
 */
export async function deleteSection(id: string): Promise<void> {
  try {
    await db.delete(menuSections).where(eq(menuSections.id, id));
  } catch (err: unknown) {
    // Postgres FK restrict fires as a 23503 error code
    const pgCode =
      err != null &&
      typeof err === 'object' &&
      'code' in err
        ? (err as { code: string }).code
        : null;
    if (pgCode === PG_FK_VIOLATION) {
      throw new MenuSectionHasItemsError(id);
    }
    throw err;
  }
}

// ─── Item queries ─────────────────────────────────────────────────────────────

export interface ListItemsOptions {
  includeUnavailable?: boolean;
}

/**
 * List all items within a section, sorted by (sort_order asc, name asc).
 * By default only returns available items.
 */
export async function listItemsBySection(
  sectionId: string,
  opts: ListItemsOptions = {},
): Promise<MenuItem[]> {
  const { includeUnavailable = false } = opts;

  const sectionFilter = eq(menuItems.sectionId, sectionId);
  const availableFilter = eq(menuItems.available, true);

  return db
    .select()
    .from(menuItems)
    .where(
      includeUnavailable
        ? sectionFilter
        : and(sectionFilter, availableFilter),
    )
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
}

/**
 * Get a single item by id. Returns null if not found.
 */
export async function getItemById(id: string): Promise<MenuItem | null> {
  const rows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Insert a new menu item. Returns the created row.
 */
export async function createItem(
  input: NewMenuItem & { actorId: string },
): Promise<MenuItem> {
  const { actorId, ...rest } = input;
  const rows = await db
    .insert(menuItems)
    .values({ ...rest, createdBy: actorId, updatedBy: actorId })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error('createItem: insert returned no rows');
  }
  return row;
}

/**
 * Update a menu item by id. Returns the updated row.
 * Throws if the row does not exist.
 */
export async function updateItem(
  id: string,
  input: Partial<NewMenuItem> & { actorId: string },
): Promise<MenuItem> {
  const { actorId, ...rest } = input;
  const rows = await db
    .update(menuItems)
    .set({ ...rest, updatedBy: actorId, updatedAt: new Date() })
    .where(eq(menuItems.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`updateItem: no item found with id ${id}`);
  }
  return row;
}

/**
 * Hard-delete a menu item by id.
 */
export async function deleteItem(id: string): Promise<void> {
  await db.delete(menuItems).where(eq(menuItems.id, id));
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

/**
 * Bulk-reindex menu sections according to the provided ordered ID array.
 * Each section's sort_order is set to its index (0-based) in the array.
 * Runs in a transaction; writes updated_at and updated_by on every touched row.
 */
export async function reorderSections(
  orderedIds: string[],
  actorId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(menuSections)
        .set({
          sortOrder: i,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(eq(menuSections.id, orderedIds[i]!));
    }
  });
}

/**
 * Bulk-reindex menu items within a section according to the provided ordered ID
 * array. Each item's sort_order is set to its index (0-based) in the array.
 * The sectionId constraint ensures items can only be reordered within their own
 * section. Runs in a transaction; writes updated_at and updated_by on every
 * touched row.
 */
export async function reorderItems(
  sectionId: string,
  orderedIds: string[],
  actorId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(menuItems)
        .set({
          sortOrder: i,
          updatedBy: actorId,
          updatedAt: new Date(),
        })
        .where(and(eq(menuItems.id, orderedIds[i]!), eq(menuItems.sectionId, sectionId)));
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the current ordered list of menu section IDs (sort_order ASC, name ASC).
 * Used by the reorder action to capture the "before" snapshot for the audit log.
 */
export async function getSectionIds(): Promise<string[]> {
  const rows = await db
    .select({ id: menuSections.id })
    .from(menuSections)
    .orderBy(asc(menuSections.sortOrder), asc(menuSections.name));
  return rows.map((r) => r.id);
}

/**
 * Return the current ordered list of item IDs within a section
 * (sort_order ASC, name ASC).
 * Used by the reorder action to capture the "before" snapshot for the audit log.
 */
export async function getItemIdsBySection(sectionId: string): Promise<string[]> {
  const rows = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(eq(menuItems.sectionId, sectionId))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
  return rows.map((r) => r.id);
}

// ─── Joined view (Phase 5 public menu page) ───────────────────────────────────

export interface ItemWithSection extends MenuItem {
  section: MenuSection;
}

/**
 * List all items joined with their section, sorted by
 * (section.sort_order, section.name, item.sort_order, item.name).
 * Intended for use by the public menu page in Phase 5.
 * Not used yet — ship the function so Phase 5 can import it without changes.
 */
export async function listAllItemsWithSection(
  opts: ListItemsOptions = {},
): Promise<ItemWithSection[]> {
  const { includeUnavailable = false } = opts;

  const rows = await db
    .select({
      // item columns
      id: menuItems.id,
      sectionId: menuItems.sectionId,
      name: menuItems.name,
      description: menuItems.description,
      priceCents: menuItems.priceCents,
      allergens: menuItems.allergens,
      imagePath: menuItems.imagePath,
      available: menuItems.available,
      showPrice: menuItems.showPrice,
      sortOrder: menuItems.sortOrder,
      createdAt: menuItems.createdAt,
      updatedAt: menuItems.updatedAt,
      createdBy: menuItems.createdBy,
      updatedBy: menuItems.updatedBy,
      // section columns (nested) — includes showPrices via full model select
      sectionRow: menuSections,
    })
    .from(menuItems)
    .innerJoin(menuSections, eq(menuItems.sectionId, menuSections.id))
    .where(
      includeUnavailable
        ? undefined
        : and(eq(menuItems.available, true), eq(menuSections.available, true)),
    )
    .orderBy(
      asc(menuSections.sortOrder),
      asc(menuSections.name),
      asc(menuItems.sortOrder),
      asc(menuItems.name),
    );

  return rows.map((r) => ({
    id: r.id,
    sectionId: r.sectionId,
    name: r.name,
    description: r.description,
    priceCents: r.priceCents,
    allergens: r.allergens,
    imagePath: r.imagePath,
    available: r.available,
    showPrice: r.showPrice,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: r.createdBy,
    updatedBy: r.updatedBy,
    section: r.sectionRow,
  }));
}
