-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0024: Add resend to integrations
--
-- The integrations_name_check constraint locks down which names are allowed.
-- We must drop + recreate it to add 'resend'.
--
-- Resend api_key is a secret — stored in the encrypted `credentials` bytea
-- column via the existing set_integration_credentials / get_integration_credentials
-- SQL functions (same path as untappd / printify).
--
-- from_email and reply_to are NOT secrets — they are stored in the `config`
-- jsonb column so the email layer can read them without decryption.
--
-- RLS: existing policies already cover admin-only select/update on integrations.
-- No new policies needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Expand name constraint to include resend ─────────────────────────────────

alter table public.integrations
  drop constraint integrations_name_check;

alter table public.integrations
  add constraint integrations_name_check
  check (name IN ('untappd', 'printify', 'plausible', 'resend'));

-- ─── Seed resend row ──────────────────────────────────────────────────────────

insert into public.integrations (name, enabled, mode, config)
values (
  'resend',
  false,
  'mock',
  '{"from_email": "", "reply_to": ""}'::jsonb
)
on conflict (name) do nothing;
