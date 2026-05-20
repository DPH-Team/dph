-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0009: weekly_hours RLS, triggers, cross-schema FK, and seed data
-- Applies after the Drizzle-generated 0008 migration that creates the table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FK (Drizzle cannot reference auth schema) ──────────────────

alter table public.weekly_hours
  add constraint weekly_hours_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger weekly_hours_set_updated_at
  before update on public.weekly_hours
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.weekly_hours enable row level security;

-- ─── RLS policies: weekly_hours ───────────────────────────────────────────────

-- Anon + authenticated: read all rows (weekly schedule is public information;
-- the public site displays it directly with no draft concept).
create policy "weekly_hours_select_all"
  on public.weekly_hours
  for select
  using (true);

-- Staff + admin: insert / update / delete
create policy "weekly_hours_write_staff"
  on public.weekly_hours
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─── Seed: 7 rows from lib/fixtures/hours.ts ─────────────────────────────────

insert into public.weekly_hours (day_of_week, closed, open_time, close_time) values
  ('monday',    false, '15:00', '22:00'),
  ('tuesday',   false, '15:00', '22:00'),
  ('wednesday', false, '15:00', '23:00'),
  ('thursday',  false, '15:00', '23:00'),
  ('friday',    false, '12:00', '00:00'),
  ('saturday',  false, '11:00', '00:00'),
  ('sunday',    false, '11:00', '21:00')
on conflict (day_of_week) do nothing;
