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
 *       sales_channel_listings: [{ url: string, ... }],
 *       tags: string[],
 *       // ...
 *     }],
 *     current_page: number,
 *     last_page: number,
 *   }
 *
 * printifyUrl: use the first sales channel listing URL if present; fall back
 * to the PRINTIFY_STORE_URL constant from lib/fixtures/merch.ts.
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

    // ── printifyUrl: first sales channel listing URL, else store fallback ──
    const listings = Array.isArray(p['sales_channel_listings'])
      ? (p['sales_channel_listings'] as unknown[])
      : [];
    const firstListing = listings[0];
    const listingUrl =
      firstListing &&
      typeof firstListing === 'object' &&
      typeof (firstListing as Record<string, unknown>)['url'] === 'string'
        ? ((firstListing as Record<string, unknown>)['url'] as string)
        : null;

    // ── tags ──
    const tags = Array.isArray(p['tags'])
      ? (p['tags'] as unknown[]).filter((t) => typeof t === 'string').map(String)
      : [];

    // ── category: derive from product_type field, fall back to first tag, then 'Other' ──
    const productType =
      typeof p['product_type'] === 'string' && p['product_type']
        ? (p['product_type'] as string)
        : null;
    const category = productType ?? (tags.length > 0 ? tags[0] : 'Other');

    return {
      id: String(p['id'] ?? `product-${index}`),
      title: String(p['title'] ?? 'Untitled Product'),
      priceCents,
      imageUrl,
      printifyUrl: listingUrl ?? PRINTIFY_STORE_URL,
      tags,
      category,
    };
  });
}

// ─── Cached live fetch (products) ─────────────────────────────────────────────

/**
 * getCachedProductsRaw — private Next Data Cache wrapper around the live
 * Printify products fetch.
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
    const url = `https://api.printify.com/v1/shops/${encodeURIComponent(shop_id)}/products.json`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${api_key}`,
        'User-Agent': 'District-Pour-Haus/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`[printify] products endpoint returned ${res.status}`);
    }

    const json: unknown = await res.json();
    return normalizeProducts(json);
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
