-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0007: hours_overrides RLS, triggers, and cross-schema FKs
-- Applies after the Drizzle-generated 0006 migration that creates the table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FKs (Drizzle cannot reference auth schema) ─────────────────

alter table public.hours_overrides
  add constraint hours_overrides_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.hours_overrides
  add constraint hours_overrides_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger hours_overrides_set_updated_at
  before update on public.hours_overrides
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.hours_overrides enable row level security;

-- ─── RLS policies: hours_overrides ───────────────────────────────────────────

-- Anon + authenticated: read every override (override existence is not sensitive;
-- the public site overlays them on weekly defaults with no draft concept).
create policy "hours_overrides_select_all"
  on public.hours_overrides
  for select
  using (true);

-- Staff + admin: insert / update / delete
create policy "hours_overrides_write_staff"
  on public.hours_overrides
  for all
  using (public.is_staff())
  with check (public.is_staff());
