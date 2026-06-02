-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0023: Add plausible to integrations
--
-- The integrations_name_check constraint locks down which names are allowed.
-- We must drop + recreate it to add 'plausible'.
--
-- Plausible domain/host are stored in the `config` jsonb column (not encrypted
-- credentials) because they are NOT secrets — the script tag is client-visible.
-- The `enabled` toggle gates whether the public layout injects the script.
--
-- RLS: existing policies already cover admin-only select/update on integrations.
-- No new policies needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Expand name constraint to include plausible ──────────────────────────────

alter table public.integrations
  drop constraint integrations_name_check;

alter table public.integrations
  add constraint integrations_name_check
  check (name IN ('untappd', 'printify', 'plausible'));

-- ─── Seed plausible row ───────────────────────────────────────────────────────

insert into public.integrations (name, enabled, mode, config)
values (
  'plausible',
  false,
  'mock',
  '{"domain": "", "host": "https://plausible.io"}'::jsonb
)
on conflict (name) do nothing;
