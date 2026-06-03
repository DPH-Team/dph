-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0028: menu price-visibility flags
-- Adds show_price (item-level) and show_prices (section-level) boolean columns.
-- No RLS changes needed — these columns sit on existing RLS-protected tables.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE menu_items
  ADD COLUMN show_price boolean NOT NULL DEFAULT true;

ALTER TABLE menu_sections
  ADD COLUMN show_prices boolean NOT NULL DEFAULT true;
