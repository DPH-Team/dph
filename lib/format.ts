/**
 * lib/format.ts — Shared formatting helpers for District Pour Haus.
 */

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/**
 * Format an integer cents value as a USD currency string.
 * e.g. formatCents(1250) → "$12.50"
 * e.g. formatCents(0) → "$0.00"
 */
export function formatCents(cents: number): string {
  return usdFormatter.format(cents / 100);
}
