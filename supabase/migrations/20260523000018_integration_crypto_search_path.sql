-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0018: Fix integration credential RPCs to find pgcrypto
--
-- The original definitions (0001) used `set search_path = public`, but on
-- Supabase pgcrypto lives in the `extensions` schema. Calls like
-- pgp_sym_encrypt() / pgp_sym_decrypt() therefore failed with
-- `function pgp_sym_encrypt(text, text) does not exist`.
--
-- Solution: include `extensions` in the function-local search_path. `pg_temp`
-- is appended per the standard SECURITY DEFINER hygiene rule.
--
-- CREATE OR REPLACE preserves grants/revokes from migration 0001, so no
-- re-grant statements are needed.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_integration_credentials(
  p_name    text,
  p_plaintext jsonb,
  p_key     text
)
  returns void
  language plpgsql
  security definer
  set search_path = public, extensions, pg_temp
  as $$
begin
  update public.integrations
  set credentials = pgp_sym_encrypt(p_plaintext::text, p_key)::bytea,
      updated_at  = now()
  where name = p_name;
end;
$$;

create or replace function public.get_integration_credentials(
  p_name text,
  p_key  text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public, extensions, pg_temp
  as $$
declare
  v_creds bytea;
begin
  select credentials into v_creds
  from public.integrations
  where name = p_name;

  if v_creds is null or v_creds = '\x'::bytea then
    return '{}'::jsonb;
  end if;

  return pgp_sym_decrypt(v_creds, p_key)::jsonb;
exception
  when others then
    -- Return empty rather than exposing decryption errors
    return null;
end;
$$;
