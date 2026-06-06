-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0033: tap_takeovers RLS, triggers, and cross-schema FKs
-- Applies after the Drizzle-generated 0032 migration that creates the table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FKs (Drizzle cannot reference auth schema) ─────────────────

alter table public.tap_takeovers
  add constraint tap_takeovers_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.tap_takeovers
  add constraint tap_takeovers_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger tap_takeovers_set_updated_at
  before update on public.tap_takeovers
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.tap_takeovers enable row level security;

-- ─── RLS policies: tap_takeovers ─────────────────────────────────────────────

-- Staff + admin: read the schedule (the public overlay reads via service-role
-- and bypasses RLS; anonymous visitors have no direct access to this table).
create policy "tap_takeovers_select_staff"
  on public.tap_takeovers
  for select
  using (public.is_staff());

-- Staff + admin: insert / update / delete
create policy "tap_takeovers_write_staff"
  on public.tap_takeovers
  for all
  using (public.is_staff())
  with check (public.is_staff());
