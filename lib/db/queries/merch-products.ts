/**
 * lib/db/queries/merch-products.ts — DB helpers for the merch_products table.
 *
 * Public read functions use the Drizzle `db` client so RLS applies
 * (select policy: deleted_at IS NULL AND visible = true).
 *
 * Write helpers (upsertMerchRows, softDeleteMissingMerch) also use the Drizzle
 * `db` client, which connects directly to Postgres via DATABASE_URL (the pooler
 * `postgres` role). That role owns the tables and therefore bypasses RLS — the
 * same pattern every other query module in this project uses. merch_products has
 * no write RLS policy, and these helpers are server-only, invoked exclusively
 * by the merch sync cron route and the admin "Sync now" action.
 *
 * upsertMerchRows deliberately omits `visible` from the ON CONFLICT DO UPDATE set
 * so that an admin-toggled hide is preserved across re-syncs.
 */

import 'server-only';

import { isNull, notInArray, inArray, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { merchProducts } from '@/lib/db/schema';
import type { MerchProductRow, NewMerchProductRow } from '@/lib/db/schema';

// ─── Public read helpers ──────────────────────────────────────────────────────

/**
 * Return all non-deleted AND visible rows, ordered by sort_order asc.
 * Uses the Drizzle `db` client (DATABASE_URL / postgres role) which bypasses
 * RLS as the table owner — no anon/service-role client needed.
 */
export async function listMerchProductRows(): Promise<MerchProductRow[]> {
  return db
    .select()
    .from(merchProducts)
    .where(
      sql`${merchProducts.deletedAt} IS NULL AND ${merchProducts.visible} = true`,
    )
    .orderBy(asc(merchProducts.sortOrder));
}

// ─── Lookup helper (used by sync to read current image state per product) ────

/**
 * Return rows matching the given printifyProductId list.
 * Returns all matching rows regardless of deleted_at or visible so the sync
 * engine can detect resurrection and inspect current image state.
 */
export async function getMerchRowsByIds(
  ids: string[],
): Promise<MerchProductRow[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(merchProducts)
    .where(inArray(merchProducts.printifyProductId, ids));
}

// ─── Write helpers (db client / postgres role, called by sync — not by user sessions) ──

/**
 * Upsert a batch of merch product rows from the Printify sync.
 *
 * Uses INSERT … ON CONFLICT (printify_product_id) DO UPDATE so rows that already
 * exist are refreshed in-place. Sets synced_at = now() and clears deleted_at so
 * previously soft-deleted products resurface if Printify reports them again.
 *
 * VISIBLE STABILITY: `visible` is intentionally excluded from the DO UPDATE set.
 * An admin hide (visible = false) is preserved across re-syncs — the product stays
 * hidden until an admin explicitly re-enables it.
 *
 * Uses the Drizzle `db` client (DATABASE_URL / postgres role) which bypasses
 * RLS as the table owner — no service-role client needed.
 */
export async function upsertMerchRows(
  rows: NewMerchProductRow[],
): Promise<void> {
  if (rows.length === 0) return;

  const now = new Date();

  const records = rows.map((r) => ({
    printifyProductId: r.printifyProductId,
    title: r.title,
    priceCents: r.priceCents ?? 0,
    category: r.category ?? 'Other',
    tags: r.tags ?? [],
    printifyUrl: r.printifyUrl,
    imagePath: r.imagePath ?? null,
    sourceImageUrl: r.sourceImageUrl ?? null,
    sortOrder: r.sortOrder ?? 0,
    visible: r.visible ?? true,
    syncedAt: now,
    deletedAt: null,
    updatedAt: now,
  }));

  await db
    .insert(merchProducts)
    .values(records)
    .onConflictDoUpdate({
      target: merchProducts.printifyProductId,
      // visible is intentionally absent — never overwrite an admin hide.
      set: {
        title: sql`excluded.title`,
        priceCents: sql`excluded.price_cents`,
        category: sql`excluded.category`,
        tags: sql`excluded.tags`,
        printifyUrl: sql`excluded.printify_url`,
        imagePath: sql`excluded.image_path`,
        sourceImageUrl: sql`excluded.source_image_url`,
        sortOrder: sql`excluded.sort_order`,
        syncedAt: sql`excluded.synced_at`,
        deletedAt: sql`excluded.deleted_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

/**
 * Soft-delete merch products that are no longer reported by Printify.
 *
 * Sets deleted_at = now() (and updated_at = now()) on all rows where
 * printify_product_id is NOT IN the provided list and deleted_at IS NULL.
 * Returns the soft-deleted rows' { printifyProductId, imagePath } so the
 * caller can delete their corresponding storage objects.
 *
 * GUARD: if liveProductIds is empty, do nothing and return [] — the caller
 * should treat an empty response as a fetch error, not a "no products" signal.
 *
 * Uses the Drizzle `db` client (DATABASE_URL / postgres role) — same as
 * upsertMerchRows. No service-role client needed.
 */
export async function softDeleteMissingMerch(
  liveProductIds: string[],
): Promise<{ printifyProductId: string; imagePath: string | null }[]> {
  // Guard: if the live list is empty we refuse to delete everything — the caller
  // should treat an empty response as a fetch error, not a "no products" signal.
  if (liveProductIds.length === 0) return [];

  const now = new Date();

  const deleted = await db
    .update(merchProducts)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      sql`${notInArray(merchProducts.printifyProductId, liveProductIds)} AND ${isNull(merchProducts.deletedAt)}`,
    )
    .returning({
      printifyProductId: merchProducts.printifyProductId,
      imagePath: merchProducts.imagePath,
    });

  return deleted;
}
