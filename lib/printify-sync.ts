/**
 * lib/printify-sync.ts — Shared merch-sync logic.
 *
 * Exports:
 *   runMerchSync()  The full fetch-mirror-upsert-softdelete pipeline, used by
 *                  both the Vercel Cron route and the admin "Sync now" button so
 *                  both paths share a single code path.
 *
 * Design decisions (mirrors lib/untappd-sync.ts):
 *   - runMerchSync() calls revalidateTag('merch','max') itself so BOTH callers
 *     get the ISR bust automatically without each having to remember to call it.
 *   - Auth (CRON_SECRET) and HTTP response shape live in the cron route.
 *   - Per-product image download/upload failures are NON-FATAL: the sync
 *     continues with the existing imagePath (or null) and logs the error.
 *   - If fetchLiveProducts() throws OR returns mode='mock' → DB is untouched
 *     (skipped:true). A full DB/storage write failure → skipped:false.
 *
 * Return shape:
 *   { ok: true;  upserted: number; downloaded: number; softDeleted: number }
 *   { ok: false; skipped: true;  reason: string }  ← upstream mock/fetch-fail
 *   { ok: false; skipped: false; reason: string }  ← DB/storage write failed
 */

import 'server-only';

import { revalidateTag } from 'next/cache';
import { fetchLiveProducts } from '@/lib/printify';
import {
  getMerchRowsByIds,
  upsertMerchRows,
  softDeleteMissingMerch,
} from '@/lib/db/queries/merch-products';
import { uploadBufferToMedia, deleteObject } from '@/lib/supabase/storage';
import type { NewMerchProductRow, MerchProductRow } from '@/lib/db/schema';

// ─── Sync result type ─────────────────────────────────────────────────────────

export type MerchSyncResult =
  | { ok: true; upserted: number; downloaded: number; softDeleted: number }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

// ─── Image content-type helpers ───────────────────────────────────────────────

/**
 * Derive a file extension from a Content-Type header value.
 * Falls back to the URL path extension, then 'jpg'.
 */
function extFromContentType(contentType: string, sourceUrl: string): string {
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';

  // Fall back to URL path extension.
  try {
    const pathname = new URL(sourceUrl).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    if (match) {
      const ext = match[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
  } catch {
    // Malformed URL — fall through to default.
  }

  return 'jpg';
}

/**
 * Resolve MIME type from file extension.
 * Used when uploading to Supabase Storage so the object is served with the
 * correct Content-Type header.
 */
function mimeFromExt(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

// ─── Core sync ────────────────────────────────────────────────────────────────

/**
 * runMerchSync — shared merch-sync pipeline used by both the Vercel Cron route
 * and the admin "Sync now" server action.
 *
 * Pipeline:
 *   1. fetchLiveProducts() — if throws OR mode='mock' → skip (DB untouched).
 *   2. Load existing DB rows for all live product ids.
 *   3. For each product: reuse existing image when unchanged, else download + upload.
 *      Per-image failures are NON-FATAL (fall back to existing or null).
 *   4. upsertMerchRows() — on failure → { ok:false, skipped:false }.
 *   5. softDeleteMissingMerch() + delete orphaned storage objects (best-effort).
 *   6. revalidateTag('merch','max').
 *   7. Return { ok:true, upserted, downloaded, softDeleted }.
 */
export async function runMerchSync(): Promise<MerchSyncResult> {
  // Step 1: fetch live products from Printify.
  // Let fetchLiveProducts throw on upstream failure so we can skip cleanly.
  let live: Awaited<ReturnType<typeof fetchLiveProducts>>;
  try {
    live = await fetchLiveProducts();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[printify-sync] fetchLiveProducts failed — skipping sync cycle:', reason);
    return { ok: false, skipped: true, reason };
  }

  if (live.mode === 'mock') {
    const reason = 'Printify integration is in mock mode or credentials are missing.';
    console.info('[printify-sync] mode=mock — skipping sync cycle');
    return { ok: false, skipped: true, reason };
  }

  const products = live.data;
  const liveIds = products.map((p) => p.id);

  // Step 2: load existing rows (including soft-deleted) indexed by printifyProductId.
  const existingRows = await getMerchRowsByIds(liveIds);
  const existingByProductId = new Map<string, MerchProductRow>(
    existingRows.map((row) => [row.printifyProductId, row]),
  );

  // Step 3: build rows, downloading images where needed.
  let downloaded = 0;
  const rows: NewMerchProductRow[] = [];

  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    const source = product.imageUrl; // raw Printify image src
    const existingRow = existingByProductId.get(product.id);

    let imagePath: string | null = null;

    if (
      source &&
      existingRow &&
      existingRow.sourceImageUrl === source &&
      existingRow.imagePath !== null &&
      existingRow.deletedAt === null
    ) {
      // Image unchanged and the row is not soft-deleted — reuse existing path.
      imagePath = existingRow.imagePath;
    } else if (source) {
      // Need to download and upload the image.
      try {
        const imageResponse = await fetch(source, {
          signal: AbortSignal.timeout(10_000),
        });

        if (!imageResponse.ok) {
          throw new Error(`Image fetch returned ${imageResponse.status}`);
        }

        const contentType = imageResponse.headers.get('content-type') ?? '';
        const ext = extFromContentType(contentType, source);
        const mime = mimeFromExt(ext);
        const bytes = await imageResponse.arrayBuffer();
        const storagePath = `merch/${product.id}.${ext}`;

        const { path: uploadedPath } = await uploadBufferToMedia({
          bucket: 'media',
          path: storagePath,
          bytes,
          contentType: mime,
          upsert: true,
        });

        imagePath = uploadedPath;
        downloaded++;
      } catch (err) {
        // Per-image failure is non-fatal.
        console.error(
          `[printify-sync] image download/upload failed for product ${product.id} (${source}):`,
          err instanceof Error ? err.message : String(err),
        );
        // Fall back to existing row's imagePath if available.
        imagePath = existingRow?.imagePath ?? null;
      }
    } else {
      // No source image URL — fall back to existing or null.
      imagePath = existingRow?.imagePath ?? null;
    }

    rows.push({
      printifyProductId: product.id,
      title: product.title,
      priceCents: product.priceCents,
      category: product.category,
      tags: product.tags,
      printifyUrl: product.printifyUrl,
      imagePath,
      sourceImageUrl: source || null,
      sortOrder: index,
      syncedAt: new Date(),
      // visible is intentionally absent — upsertMerchRows preserves existing value.
    });
  }

  // Steps 4–6: DB writes + cache bust. A failure here → skipped:false.
  try {
    // Step 4: upsert all product rows.
    await upsertMerchRows(rows);

    // Step 5: soft-delete products no longer in the live list.
    const deleted = await softDeleteMissingMerch(liveIds);

    // Delete orphaned storage objects (best-effort — non-fatal).
    for (const d of deleted) {
      if (d.imagePath) {
        await deleteObject({ bucket: 'media', path: d.imagePath }).catch((err) => {
          console.error(
            `[printify-sync] deleteObject failed for ${d.imagePath} (non-fatal):`,
            err instanceof Error ? err.message : String(err),
          );
        });
      }
    }

    // Step 6: bust the public ISR merch cache.
    revalidateTag('merch', 'max');

    // Step 7: success.
    return {
      ok: true,
      upserted: rows.length,
      downloaded,
      softDeleted: deleted.length,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[printify-sync] DB/storage write failed:', reason);
    return { ok: false, skipped: false, reason };
  }
}
