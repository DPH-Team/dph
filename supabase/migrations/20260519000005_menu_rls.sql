-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0005: Menu RLS, constraints, indexes, triggers, and cross-schema FKs
-- Applies after the Drizzle-generated 0004 migration that creates the tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Case-insensitive unique index on slug ────────────────────────────────────

create unique index menu_sections_slug_lower_idx
  on public.menu_sections (lower(slug));

-- ─── Cross-schema FKs (Drizzle cannot reference auth schema) ─────────────────

alter table public.menu_sections
  add constraint menu_sections_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.menu_sections
  add constraint menu_sections_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.menu_items
  add constraint menu_items_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.menu_items
  add constraint menu_items_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at triggers (using existing public.set_updated_at()) ─────────────

create trigger menu_sections_set_updated_at
  before update on public.menu_sections
  for each row execute procedure public.set_updated_at();

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.menu_sections enable row level security;
alter table public.menu_items enable row level security;

-- ─── RLS policies: menu_sections ─────────────────────────────────────────────

-- Anon + authenticated: see available sections
create policy "menu_sections_select_available"
  on public.menu_sections
  for select
  using (available = true);

-- Staff + admin: see all sections (including unavailable)
create policy "menu_sections_select_staff_all"
  on public.menu_sections
  for select
  using (public.is_staff());

-- Staff + admin: insert / update / delete
create policy "menu_sections_write_staff"
  on public.menu_sections
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─── RLS policies: menu_items ─────────────────────────────────────────────────

-- Anon + authenticated: see available items whose section is also available
create policy "menu_items_select_available"
  on public.menu_items
  for select
  using (
    available = true
    and exists (
      select 1
      from public.menu_sections s
      where s.id = section_id
        and s.available = true
    )
  );

-- Staff + admin: see all items regardless of availability
create policy "menu_items_select_staff_all"
  on public.menu_items
  for select
  using (public.is_staff());

-- Staff + admin: insert / update / delete
create policy "menu_items_write_staff"
  on public.menu_items
  for all
  using (public.is_staff())
  with check (public.is_staff());
