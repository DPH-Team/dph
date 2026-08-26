-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0039: add 'site_banner' to content_blocks_key_check, seed row
-- Table: public.content_blocks
-- Constraint: content_blocks_key_check
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_blocks
  drop constraint content_blocks_key_check;

alter table public.content_blocks
  add constraint content_blocks_key_check
    check (key in ('home_hero', 'home_callouts', 'about_body', 'careers_body', 'site_banner'));

-- ─── Seed: site_banner row from lib/fixtures/site-banner.ts ──────────────────
-- Disabled by default — an admin must opt in and fill out the copy before the
-- banner renders anywhere on the public site.

insert into public.content_blocks (key, value) values
  (
    'site_banner',
    '{
      "enabled": false,
      "title": "",
      "subtext": "",
      "buttonLabel": "",
      "buttonHref": "",
      "pinned": false
    }'::jsonb
  )
on conflict (key) do nothing;
