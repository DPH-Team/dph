/**
 * slugify — convert a human-readable string to a URL-safe slug.
 *
 * Rules:
 *  1. Lowercase the input.
 *  2. Replace runs of non-alphanumeric characters with a single hyphen.
 *  3. Trim leading and trailing hyphens.
 *  4. Cap at 80 characters (trim before stripping trailing hyphens introduced
 *     by the cap itself).
 *
 * No external dependencies.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
}
