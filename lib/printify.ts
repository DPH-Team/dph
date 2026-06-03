/**
 * lib/printify.ts — Server-only Printify merch fetcher.
 *
 * Exports:
 *   fetchLiveProducts()  Promise<{ mode: 'mock' } | { mode: 'live'; data: MerchProduct[] }>
 *
 * Mock/live precedence (first match → mock):
 *   1. integration row absent, disabled, or mode !== 'live'  → mock
 *   2. mode === 'live' but creds null / {} (decrypt fail)    → mock + warn
 *   3. creds present                                         → live fetch
 *   4. live fetch throws / non-2xx / timeout                 → throw (let sync catch)
 *
 * Checkout does NOT happen on our site. Each product card carries a
 * printifyUrl that opens the Printify Pop-Up Store in a new tab.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { getIntegration, decryptCredentials } from '@/lib/db/queries/integrations';
import { PRINTIFY_STORE_URL } from '@/lib/fixtures/merch';
import { slugify } from '@/lib/slugify';
import type { MerchProduct } from '@/lib/fixtures/types';

// ─── Credential resolution ────────────────────────────────────────────────────

type PrintifyMode =
  | { mode: 'mock' }
  | { mode: 'live'; creds: { api_key: string; shop_id: string } };

/**
 * resolvePrintifyMode — decision logic shared by fetchLiveProducts.
 *
 * Returns mock mode whenever:
 *   - the integration row is absent, disabled, or set to 'mock'
 *   - decryptCredentials returns null or an empty object
 *   - the decrypted payload is missing required keys
 *
 * Never logs or surfaces credential values.
 */
async function resolvePrintifyMode(): Promise<PrintifyMode> {
  let row: Awaited<ReturnType<typeof getIntegration>>;
  try {
    row = await getIntegration('printify');
  } catch {
    // DB unavailable — treat as mock so the page still renders.
    return { mode: 'mock' };
  }

  if (!row || !row.enabled || row.mode !== 'live') {
    return { mode: 'mock' };
  }

  let rawCreds: Record<string, unknown> | null;
  try {
    rawCreds = await decryptCredentials('printify');
  } catch {
    console.warn('[printify] decryptCredentials threw — falling back to mock');
    return { mode: 'mock' };
  }

  // null = key missing or decrypt failure; {} = creds never set
  if (!rawCreds || Object.keys(rawCreds).length === 0) {
    console.warn('[printify] mode=live but credentials missing or empty — falling back to mock');
    return { mode: 'mock' };
  }

  const api_key = typeof rawCreds['api_key'] === 'string' ? rawCreds['api_key'] : '';
  const shop_id = typeof rawCreds['shop_id'] === 'string' ? rawCreds['shop_id'] : '';

  if (!api_key || !shop_id) {
    console.warn('[printify] mode=live but required credential keys absent — falling back to mock');
    return { mode: 'mock' };
  }

  return { mode: 'live', creds: { api_key, shop_id } };
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

/**
 * isAbsoluteUrl — returns true when the value starts with "http://" or
 * "https://". Used to detect the Pop-Up store case where external.handle is
 * already a full URL (OBSERVED in production: external.handle arrives as
 * "https://districtpourhaus.printify.me/product/28908097" — an absolute URL
 * using the published/external id, NOT the internal product id).
 */
function isAbsoluteUrl(value: string): boolean {
  return value.startsWith('https://') || value.startsWith('http://');
}

/**
 * joinUrl — safely concatenate a base URL and a relative path so that the
 * result never contains "//" in the path segment (other than after the scheme).
 *
 * Rules:
 *   - Trailing slash on base is stripped before joining.
 *   - Leading slash on path is ensured.
 *   - Never call with an absolute `path` — use the value directly in that case.
 *
 * Examples:
 *   joinUrl("https://foo.printify.me",  "/product/123")  → "https://foo.printify.me/product/123"
 *   joinUrl("https://foo.printify.me/", "product/123")   → "https://foo.printify.me/product/123"
 *   joinUrl("https://foo.printify.me",  "product/123")   → "https://foo.printify.me/product/123"
 */
function joinUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

// ─── Product normalisation ────────────────────────────────────────────────────

/**
 * normalizeProducts — maps the Printify products list JSON to MerchProduct[].
 *
 * The Printify GET /v1/shops/{shop_id}/products.json endpoint returns an
 * envelope like:
 *   {
 *     data: [{
 *       id: string,
 *       title: string,
 *       images: [{ src: string, is_default: boolean, ... }],
 *       variants: [{ price: number, is_enabled: boolean, ... }],
 *       tags: string[],
 *       product_type: string,
 *       // Published-to-Pop-Up-Store fields:
 *       external: { id: string; handle: string; url?: string } | null,
 *       // External-channel (Shopify/Etsy/etc.) listings — NOT populated for
 *       // the Pop-Up store, which uses the `external` object instead:
 *       sales_channel_listings: [{ channel_type: string; url?: string; ... }],
 *       // ...
 *     }],
 *     current_page: number,
 *     last_page: number,
 *   }
 *
 * OBSERVED in production: when a product is published to the Pop-Up store the
 * `external` object is populated with `{ id, handle }` where `handle` is an
 * ABSOLUTE URL such as "https://districtpourhaus.printify.me/product/28908097"
 * (using the published/external id, NOT the internal product `id`). The handle
 * field is NOT a bare slug as previously assumed — it arrives as a full URL.
 *
 * `sales_channel_listings` covers third-party channels (Shopify, Etsy,
 * WooCommerce, etc.) — it is typically empty for Pop-Up-only products and does
 * NOT carry a `url` field for the Pop-Up store.
 *
 * printifyUrl resolution (candidates tried in order; first usable value wins):
 *   1. external.handle  — OBSERVED to be an absolute URL for Pop-Up products.
 *      If absolute → use directly. If non-empty relative → join with base.
 *   2. external.url     — INFERRED: may be present on some API responses.
 *      If absolute → use directly. If non-empty relative → join with base.
 *   3. sales_channel_listings[0].url — absolute URL from a third-party channel
 *      (Shopify, Etsy, etc.). Only use if it is an absolute https:// URL.
 *   4. Construct from base using external.id (published id) when present, else
 *      internal product id, plus slugify(title) as path:
 *      joinUrl(PRINTIFY_STORE_URL, `/product/${externalId ?? productId}/${slug}`)
 *      (INFERRED: this path is a safe approximation for products where the
 *      external object exists with an id but no usable handle.)
 *   5. joinUrl(PRINTIFY_STORE_URL, `/product/${productId}`) — id-only fallback
 *      when no handle or slug is derivable.
 *   6. Bare PRINTIFY_STORE_URL — last resort for unpublished products that have
 *      no external object and no product page yet.
 *
 * CRITICAL INVARIANT: an absolute URL (http:// or https://) is ALWAYS used
 * directly and NEVER prepended with PRINTIFY_STORE_URL. Concatenating a base
 * onto an absolute URL produces a malformed URL
 * (e.g. "https://foo.me/product/X/https:/foo.me/product/Y").
 *
 * priceCents: derived from the lowest enabled variant price (Printify prices
 * are in cents already for USD shops). Defaults to 0 when no enabled variant.
 *
 * imageUrl: first image marked is_default, else first image, else empty string.
 *
 * Defensive access throughout — all fields default gracefully when absent.
 */
function normalizeProducts(raw: unknown): MerchProduct[] {
  if (!raw || typeof raw !== 'object') return [];

  const envelope = raw as Record<string, unknown>;

  // Products list is under "data" in the paginated envelope.
  const items = Array.isArray(envelope['data']) ? envelope['data'] : [];

  return items.map((item, index): MerchProduct => {
    if (!item || typeof item !== 'object') {
      return {
        id: `product-unknown-${index}`,
        title: 'Unknown Product',
        priceCents: 0,
        imageUrl: '',
        printifyUrl: PRINTIFY_STORE_URL,
        tags: [],
        category: 'Other',
      };
    }

    const p = item as Record<string, unknown>;

    // ── price: lowest enabled variant, already in cents ──
    const variants = Array.isArray(p['variants']) ? (p['variants'] as unknown[]) : [];
    const enabledPrices = variants
      .filter(
        (v) =>
          v &&
          typeof v === 'object' &&
          (v as Record<string, unknown>)['is_enabled'] === true &&
          typeof (v as Record<string, unknown>)['price'] === 'number',
      )
      .map((v) => (v as Record<string, unknown>)['price'] as number);
    const priceCents = enabledPrices.length > 0 ? Math.min(...enabledPrices) : 0;

    // ── imageUrl: default image, else first image ──
    const images = Array.isArray(p['images']) ? (p['images'] as unknown[]) : [];
    const defaultImage = images.find(
      (img) =>
        img &&
        typeof img === 'object' &&
        (img as Record<string, unknown>)['is_default'] === true,
    );
    const firstImage = images[0];
    const resolvedImage = defaultImage ?? firstImage;
    const imageUrl =
      resolvedImage &&
      typeof resolvedImage === 'object' &&
      typeof (resolvedImage as Record<string, unknown>)['src'] === 'string'
        ? ((resolvedImage as Record<string, unknown>)['src'] as string)
        : '';

    // ── printifyUrl: resolve with candidate precedence 1 → 2 → 3 → 4 → 5 → 6 ──
    //
    // Gather the external object fields first.
    const externalRaw =
      p['external'] !== null &&
      p['external'] !== undefined &&
      typeof p['external'] === 'object'
        ? (p['external'] as Record<string, unknown>)
        : null;

    // external.handle — OBSERVED: arrives as an absolute URL for Pop-Up products
    // (e.g. "https://districtpourhaus.printify.me/product/28908097").
    const externalHandle =
      externalRaw && typeof externalRaw['handle'] === 'string' && externalRaw['handle']
        ? (externalRaw['handle'] as string)
        : null;

    // external.url — INFERRED: may be present on some responses.
    const externalUrl =
      externalRaw && typeof externalRaw['url'] === 'string' && externalRaw['url']
        ? (externalRaw['url'] as string)
        : null;

    // external.id — the published/external id used in Pop-Up store URLs.
    // Prefer this over the internal product id when constructing relative paths.
    const externalId =
      externalRaw && externalRaw['id'] != null ? String(externalRaw['id']) : null;

    // sales_channel_listings[0].url — third-party channel (Shopify, Etsy, etc.)
    const listings = Array.isArray(p['sales_channel_listings'])
      ? (p['sales_channel_listings'] as unknown[])
      : [];
    const firstListing = listings[0];
    const listingUrl =
      firstListing &&
      typeof firstListing === 'object' &&
      typeof (firstListing as Record<string, unknown>)['url'] === 'string' &&
      ((firstListing as Record<string, unknown>)['url'] as string).startsWith('https://')
        ? ((firstListing as Record<string, unknown>)['url'] as string)
        : null;

    // Internal product id — always present for real API products.
    const productId = p['id'] ? String(p['id']) : null;

    /**
     * resolveCandidate — given a raw string candidate from the API, returns
     * the usable URL or null.
     *
     * - Absolute URL (http:// or https://)  → return as-is (never prepend base).
     * - Relative path starting with /product/ or /  → joinUrl(base, candidate).
     * - Other non-empty relative value  → treat as a slug/handle and build
     *   /product/<externalId ?? productId>/<candidate>.
     * - Empty string or null  → null.
     */
    function resolveCandidate(candidate: string | null): string | null {
      if (!candidate) return null;
      if (isAbsoluteUrl(candidate)) return candidate;
      // Relative candidate — join safely.
      if (candidate.startsWith('/')) {
        return joinUrl(PRINTIFY_STORE_URL, candidate);
      }
      // Bare slug/handle value.
      const idSegment = externalId ?? productId;
      if (idSegment) {
        return joinUrl(PRINTIFY_STORE_URL, `/product/${idSegment}/${candidate}`);
      }
      // Cannot construct a path without an id — discard.
      return null;
    }

    // ── tags ──
    const tags = Array.isArray(p['tags'])
      ? (p['tags'] as unknown[]).filter((t) => typeof t === 'string').map(String)
      : [];

    // ── category: derive from product_type field, fall back to first tag (Title-Cased), then 'Other' ──
    const productType =
      typeof p['product_type'] === 'string' && p['product_type']
        ? (p['product_type'] as string)
        : null;

    function toTitleCase(s: string): string {
      return s
        .toLowerCase()
        .split(/[\s_-]+/)
        .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
        .join(' ');
    }

    const rawCategory = productType ?? (tags.length > 0 ? tags[0] : null);
    const category = rawCategory ? toTitleCase(rawCategory) : 'Other';

    // Evaluate candidates in priority order.
    // Candidate 1: external.handle (OBSERVED to be absolute for Pop-Up products)
    // Candidate 2: external.url (INFERRED; may be present)
    // Candidate 3: sales_channel_listings[0].url (third-party channels only)
    const printifyUrl: string =
      resolveCandidate(externalHandle) ??
      resolveCandidate(externalUrl) ??
      listingUrl ??
      (() => {
        // Candidates 4 + 5: construct from id + slugified title.
        const idSegment = externalId ?? productId;
        if (idSegment) {
          const title = String(p['title'] ?? '');
          const slug = title ? slugify(title) : null;
          return slug
            ? joinUrl(PRINTIFY_STORE_URL, `/product/${idSegment}/${slug}`)
            : joinUrl(PRINTIFY_STORE_URL, `/product/${idSegment}`);
        }
        // Candidate 6: bare store URL for unpublished products.
        return PRINTIFY_STORE_URL;
      })();

    return {
      id: String(p['id'] ?? `product-${index}`),
      title: String(p['title'] ?? 'Untitled Product'),
      priceCents,
      imageUrl,
      printifyUrl,
      tags,
      category,
    };
  });
}

// ─── Cached live fetch (products — all pages) ────────────────────────────────

/**
 * MAX_PAGES — safety cap on pagination to prevent runaway fetches.
 * Printify's pagination returns current_page / last_page in the envelope.
 * A shop with >500 products (10 pages × 50/page default) is extremely unlikely;
 * cap at 20 pages to protect against an accidentally enormous catalogue.
 */
const MAX_PAGES = 20;

/**
 * getCachedProductsRaw — Next Data Cache wrapper around the live Printify
 * products fetch. Pages through ALL pages of the paginated products endpoint
 * until last_page is reached or MAX_PAGES is hit.
 *
 * Only SUCCESSFUL responses are cached (throws on failure so failed fetches
 * are never stored). Throws propagate to fetchLiveProducts() which lets the
 * sync engine catch them and skip the cycle without touching the DB.
 *
 * Tagged ['merch'] so revalidateTag('merch', 'max') from the admin panel busts
 * this entry.
 */
const getCachedProductsRaw = unstable_cache(
  async (api_key: string, shop_id: string): Promise<MerchProduct[]> => {
    const baseUrl = `https://api.printify.com/v1/shops/${encodeURIComponent(shop_id)}/products.json`;

    async function fetchPage(page: number): Promise<unknown> {
      const url = `${baseUrl}?page=${page}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${api_key}`,
          // User-Agent is required by the Printify API.
          'User-Agent': 'District-Pour-Haus/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        throw new Error(`[printify] products page ${page} returned ${res.status}`);
      }

      return res.json() as Promise<unknown>;
    }

    // Fetch page 1 to learn last_page.
    const firstPageJson = await fetchPage(1);
    const firstEnvelope =
      firstPageJson && typeof firstPageJson === 'object'
        ? (firstPageJson as Record<string, unknown>)
        : {};

    const lastPage =
      typeof firstEnvelope['last_page'] === 'number' ? firstEnvelope['last_page'] : 1;

    // Collect products from page 1.
    const allProducts: MerchProduct[] = normalizeProducts(firstPageJson);

    // Fetch remaining pages sequentially (rate-limit friendly).
    const totalPages = Math.min(lastPage, MAX_PAGES);
    for (let page = 2; page <= totalPages; page++) {
      const pageJson = await fetchPage(page);
      const pageProducts = normalizeProducts(pageJson);
      allProducts.push(...pageProducts);
    }

    return allProducts;
  },
  ['printify-products-raw'],
  { tags: ['merch'], revalidate: 300 },
);

// ─── Public export ────────────────────────────────────────────────────────────

/**
 * fetchLiveProducts — entry point for the merch sync engine.
 *
 * Returns:
 *   { mode: 'mock' }                     — integration not live; sync should skip
 *   { mode: 'live'; data: MerchProduct[] } — fresh data ready to sync into DB
 *
 * This function does NOT catch upstream
 * errors — it lets them throw so the sync engine can distinguish "upstream down"
 * (skipped, DB untouched) from "mode=mock" (also skipped). The sync pipeline
 * wraps the call in its own try/catch.
 *
 * MerchProduct.imageUrl holds the raw Printify image src for live products —
 * that is the source_image_url for change detection. MerchProduct.id is the
 * Printify product id (→ printifyProductId).
 */
export async function fetchLiveProducts(): Promise<
  { mode: 'mock' } | { mode: 'live'; data: MerchProduct[] }
> {
  const modeResult = await resolvePrintifyMode();

  if (modeResult.mode === 'mock') {
    return { mode: 'mock' };
  }

  const { api_key, shop_id } = modeResult.creds;

  // Let errors propagate — the sync engine catches them.
  const data = await getCachedProductsRaw(api_key, shop_id);
  return { mode: 'live', data };
}
