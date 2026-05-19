-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0001: RLS, triggers, helpers, encryption functions, and seeds
-- Applies after the Drizzle-generated 0000 migration.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─── Foreign-key constraints Drizzle cannot emit (cross-schema refs) ─────────

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

alter table public.audit_log
  add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

alter table public.integrations
  add constraint integrations_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── Shared updated_at trigger function ──────────────────────────────────────

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger on profiles
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Trigger on integrations
create trigger integrations_set_updated_at
  before update on public.integrations
  for each row execute procedure public.set_updated_at();

-- ─── Auto-create profile on new auth user ────────────────────────────────────

create or replace function public.handle_new_auth_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, auth
  as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'staff')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ─── Prevent self role promotion ─────────────────────────────────────────────
-- Blocks any update that changes role unless the caller is an admin.
-- is_admin() is defined below; both functions reference each other logically,
-- but prevent_self_role_promotion calls is_admin() at runtime (no circular dep).

create or replace function public.prevent_self_role_promotion()
  returns trigger
  language plpgsql
  security invoker
  as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Only admins can change roles.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_promotion
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_promotion();

-- ─── RLS helper functions ─────────────────────────────────────────────────────

create or replace function public.current_role()
  returns app_role
  language sql
  stable
  security definer
  set search_path = public, auth
  as $$
    select role from public.profiles where id = auth.uid()
  $$;

create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  as $$
    select public.current_role() = 'admin'
  $$;

create or replace function public.is_staff()
  returns boolean
  language sql
  stable
  as $$
    select public.current_role() in ('admin', 'staff')
  $$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
alter table public.integrations enable row level security;

-- ─── RLS policies: profiles ───────────────────────────────────────────────────
-- Select: own row or admin
create policy "profiles_select_self_or_admin"
  on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

-- Update: own row or admin
create policy "profiles_update_self_or_admin"
  on public.profiles
  for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No INSERT (rows created by trigger) — no explicit policy means insert is denied
-- No DELETE — no explicit policy means delete is denied

-- ─── RLS policies: audit_log ─────────────────────────────────────────────────
-- Select: staff and admin only
create policy "audit_log_select_staff"
  on public.audit_log
  for select
  using (public.is_staff());

-- All writes denied to user roles; service-role bypasses RLS entirely.
-- No insert/update/delete policies means those are denied for authenticated users.

-- ─── RLS policies: integrations ──────────────────────────────────────────────
-- Select: admin only
create policy "integrations_select_admin"
  on public.integrations
  for select
  using (public.is_admin());

-- Update: admin only
create policy "integrations_update_admin"
  on public.integrations
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- No INSERT/DELETE policies (rows are seeded here; managed by update only)

-- ─── Encrypted credential helpers ────────────────────────────────────────────
-- SECURITY DEFINER owned by postgres so service_role can call them.
-- Only service_role is granted execute.

create or replace function public.set_integration_credentials(
  p_name    text,
  p_plaintext jsonb,
  p_key     text
)
  returns void
  language plpgsql
  security definer
  set search_path = public
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
  set search_path = public
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

-- Only service_role may call these directly (RLS bypass path)
revoke all on function public.set_integration_credentials(text, jsonb, text) from public, authenticated, anon;
revoke all on function public.get_integration_credentials(text, text) from public, authenticated, anon;
grant execute on function public.set_integration_credentials(text, jsonb, text) to service_role;
grant execute on function public.get_integration_credentials(text, text) to service_role;

-- ─── Audit log indexes ────────────────────────────────────────────────────────

create index audit_log_occurred_at_idx
  on public.audit_log (occurred_at desc);

create index audit_log_actor_occurred_idx
  on public.audit_log (actor_id, occurred_at desc);

create index audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, occurred_at desc);

-- ─── Seed integrations rows ───────────────────────────────────────────────────

insert into public.integrations (name, enabled, mode)
values
  ('untappd', false, 'mock'),
  ('printify', false, 'mock')
on conflict (name) do nothing;
