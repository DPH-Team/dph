-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0025: Add instagram to integrations
--
-- The integrations_name_check constraint locks down which names are allowed.
-- We must drop + recreate it to add 'instagram'.
--
-- Instagram uses Behold.so as its feed aggregator. The Behold feed_id is a
-- NON-secret identifier stored in the `config` jsonb column — it is not an
-- encrypted credential. The `enabled` toggle gates whether the public IG feed
-- section fetches live data vs. renders mock fixture data.
--
-- RLS: existing policies already cover admin-only select/update on integrations.
-- No new policies needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Expand name constraint to include instagram ──────────────────────────────

alter table public.integrations
  drop constraint integrations_name_check;

alter table public.integrations
  add constraint integrations_name_check
  check (name IN ('untappd', 'printify', 'plausible', 'resend', 'instagram'));

-- ─── Seed instagram row ───────────────────────────────────────────────────────

insert into public.integrations (name, enabled, mode, config)
values (
  'instagram',
  false,
  'mock',
  '{"feed_id": ""}'::jsonb
)
on conflict (name) do nothing;
