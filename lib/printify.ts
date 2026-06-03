/**
 * lib/printify.ts — Server-only Printify merch fetcher.
 *
 * Exports:
 *   fetchProducts()  Promise<{ data: MerchProduct[]; stale: boolean }>
 *
 * Mock/live precedence (first match → mock):
 *   1. integration row absent, disabled, or mode !== 'live'  → mock
 *   2. mode === 'live' but creds null / {} (decrypt fail)    → mock + warn
 *   3. creds present                                         → live fetch
 *   4. live fetch throws / non-2xx / timeout                 → graceful fallback
 *
 * Checkout does NOT happen on our site. Each product card carries a
 * printifyUrl that opens the Printify Pop-Up Store in a new tab.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';
import { getIntegration, decryptCredentials } from '@/lib/db/queries/integrations';
import { merchProducts as mockProducts, PRINTIFY_STORE_URL } from '@/lib/fixtures/merch';
import { slugify } from '@/lib/slugify';
import type { MerchProduct } from '@/lib/fixtures/types';

// ─── Credential resolution ────────────────────────────────────────────────────

type PrintifyMode =
  | { mode: 'mock' }
  | { mode: 'live'; creds: { api_key: string; shop_id: string } };

/**
 * resolvePrintifyMode — decision logic shared by fetchProducts.
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
 *       external: { id: string; handle: string } | null,
 *       // External-channel (Shopify/Etsy/etc.) listings — NOT populated for
 *       // the Pop-Up store, which uses the `external` object instead:
 *       sales_channel_listings: [{ channel_type: string; url?: string; ... }],
 *       // ...
 *     }],
 *     current_page: number,
 *     last_page: number,
 *   }
 *
 * VERIFIED from Printify API docs: when a product is published to the Pop-Up
 * store the `external` object is populated with `{ id, handle }` where handle
 * is a URL slug. `sales_channel_listings` covers third-party channels
 * (Shopify, Etsy, WooCommerce, etc.) — it is typically empty for Pop-Up-only
 * products and does NOT carry a `url` field for the Pop-Up store.
 *
 * Pop-Up store product URL pattern (confirmed):
 *   https://<shop>.printify.me/product/<product-id>/<handle>
 *
 * printifyUrl resolution (precedence):
 *   a. sales_channel_listings[0].url if it is an absolute https URL
 *      (covers products also listed on Shopify/Etsy etc.)
 *   b. Construct from PRINTIFY_STORE_URL + /product/<id>/<handle> using
 *      external.handle (if set) or slugify(title) as the handle fallback.
 *      This is the primary path for Pop-Up-store-published products.
 *   c. Fall back to bare PRINTIFY_STORE_URL when neither id nor handle is
 *      available — only unpublished products legitimately have no product page.
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

    // ── printifyUrl: resolve with this precedence ──────────────────────────
    //
    // a) sales_channel_listings[0].url — absolute URL from a third-party
    //    channel (Shopify, Etsy, etc.).  For Pop-Up-store-only products this
    //    array is typically empty or the entries lack a `url` field, which is
    //    WHY the old code always fell through to the bare store fallback.
    //    Guard: only use if it starts with "https://" to avoid relative junk.
    //
    // b) Construct Pop-Up store URL from id + handle.
    //    VERIFIED URL pattern: <PRINTIFY_STORE_URL>/product/<id>/<handle>
    //    `external.handle` is populated when the product is published to the
    //    Pop-Up store; fall back to slugify(title) when handle is absent but
    //    id is present.  (INFERRED: handle fallback from title not confirmed
    //    from docs — the slugify path is a safe approximation and is only
    //    reached if external exists with an id but no handle.)
    //
    // c) Bare PRINTIFY_STORE_URL — only for products with no id or handle,
    //    i.e. products not yet published to the Pop-Up store. No product page
    //    exists for them yet, so the store landing page is the best we can do.

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

    // external object — populated when product is published to Pop-Up store.
    const externalRaw =
      p['external'] !== null &&
      p['external'] !== undefined &&
      typeof p['external'] === 'object'
        ? (p['external'] as Record<string, unknown>)
        : null;
    const externalHandle =
      externalRaw && typeof externalRaw['handle'] === 'string' && externalRaw['handle']
        ? (externalRaw['handle'] as string)
        : null;

    // Product id (top-level) is always present for real products.
    const productId = p['id'] ? String(p['id']) : null;

    // ── tags ──
    const tags = Array.isArray(p['tags'])
      ? (p['tags'] as unknown[]).filter((t) => typeof t === 'string').map(String)
      : [];

    // ── category: derive from product_type field, fall back to first tag (Title-Cased), then 'Other' ──
    // product_type is the most representative field; if absent, use the first tag
    // and convert it to Title Case (e.g. "apparel" → "Apparel").
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

    // Resolve printifyUrl following precedence a → b → c described above.
    let printifyUrl: string;
    if (listingUrl) {
      // (a) Absolute URL from a third-party sales channel listing.
      printifyUrl = listingUrl;
    } else if (productId) {
      // (b) Construct Pop-Up store URL.
      // Use external.handle when available; fall back to slugify(title).
      // INFERRED: slugify fallback not confirmed from docs — safe approximation.
      const title = String(p['title'] ?? '');
      const handle = externalHandle ?? (title ? slugify(title) : null);
      printifyUrl = handle
        ? `${PRINTIFY_STORE_URL}/product/${productId}/${handle}`
        : `${PRINTIFY_STORE_URL}/product/${productId}`;
    } else {
      // (c) Unpublished product — no product page exists yet.
      printifyUrl = PRINTIFY_STORE_URL;
    }

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
 * are never stored). The public fetchProducts() wrapper catches the throw and
 * falls back to the last-good cache or mock fixture.
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
 * fetchProducts — public entry point for the merch page and any RSC that
 * renders the product grid.
 *
 * Returns:
 *   { data: MerchProduct[]; stale: boolean }
 *   stale=false → data is fresh (mock or live cache hit)
 *   stale=true  → live fetch failed; data is the last-known-good cache or mock
 *                 fixture fallback (cold-start edge: first-ever fetch failed)
 *
 * The caller should surface "live shop temporarily unavailable" when stale=true.
 * Checkout always redirects to the Printify Pop-Up Store — never on our site.
 */
export async function fetchProducts(): Promise<{ data: MerchProduct[]; stale: boolean }> {
  const modeResult = await resolvePrintifyMode();

  if (modeResult.mode === 'mock') {
    return { data: mockProducts, stale: false };
  }

  const { api_key, shop_id } = modeResult.creds;

  try {
    const data = await getCachedProductsRaw(api_key, shop_id);
    return { data, stale: false };
  } catch (err) {
    console.error('[printify] fetchProducts live fetch failed — returning stale/mock fallback:', err);
    // Cold-start or cache invalidated during an outage:
    // fall back to mock fixture so the page is never blank.
    return { data: mockProducts, stale: true };
  }
}
