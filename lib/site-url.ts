/**
 * lib/site-url.ts — Canonical site URL helper.
 *
 * Returns NEXT_PUBLIC_SITE_URL with any trailing slash stripped.
 * Falls back to the production domain so server-side code never
 * generates relative or blank URLs.
 */

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://districtpourhaus.com'
  ).replace(/\/$/, '');
}
