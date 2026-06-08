-- Migration: add show_on_homepage to menu_sections
--
-- Adds a boolean flag that admins use to opt a section into
-- the homepage "From the Kitchen" preview block.
-- Default FALSE keeps all existing sections off the homepage
-- until an admin explicitly enables them.
--
-- RLS policies on menu_sections are unchanged — this column
-- is fully covered by the existing public-read / admin-write
-- policies set up in the original menu_sections migration.

ALTER TABLE menu_sections
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT false;
