-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0020: subscribers RLS, triggers, and cross-schema FKs
-- Applies after 20260523000019_subscribers_schema.sql which creates the
-- subscribers table.
-- Newsletter is admin-only per Phase 4 exit criteria — all read/update/delete
-- policies are gated on public.is_admin(), not public.is_staff().
-- The anon INSERT policy is wired now so Phase 7 can plug in the public form
-- without any further migration work.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FK (Drizzle cannot reference auth schema) ──────────────────

alter table public.subscribers
  add constraint subscribers_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger subscribers_set_updated_at
  before update on public.subscribers
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.subscribers enable row level security;

-- ─── RLS policies: subscribers ───────────────────────────────────────────────

-- Anon + authenticated visitors may INSERT a subscription.
-- WITH CHECK enforces: email must already be lowercased and unsubscribed_at must
-- be null on insert (i.e. new subscribers start active).
-- This is defense-in-depth alongside the zod validator in the public form action.
-- Phase 7 will wire the actual public form; this policy is set up now.
create policy "subscribers_insert_anon"
  on public.subscribers
  for insert
  to anon, authenticated
  with check (email = lower(email) and unsubscribed_at is null);

-- Only admin may read subscriber rows (newsletter is admin-only).
create policy "subscribers_select_admin"
  on public.subscribers
  for select
  using (public.is_admin());

-- Only admin may update subscriber rows (soft-unsubscribe, resubscribe, etc.).
create policy "subscribers_update_admin"
  on public.subscribers
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Only admin may hard-delete subscriber rows (spam cleanup).
create policy "subscribers_delete_admin"
  on public.subscribers
  for delete
  using (public.is_admin());
