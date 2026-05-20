-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0013: gallery_images and team_members RLS, triggers, and cross-schema FKs
-- Applies after the schema migration 0012.
-- Follows the same pattern as 0005 (menu_rls) and 0011 (content_blocks_rls).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FKs (Drizzle cannot reference auth schema) ─────────────────

alter table public.gallery_images
  add constraint gallery_images_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.gallery_images
  add constraint gallery_images_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.team_members
  add constraint team_members_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.team_members
  add constraint team_members_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at triggers (using existing public.set_updated_at()) ─────────────

create trigger gallery_images_set_updated_at
  before update on public.gallery_images
  for each row execute procedure public.set_updated_at();

create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.gallery_images enable row level security;
alter table public.team_members enable row level security;

-- ─── RLS policies: gallery_images ────────────────────────────────────────────

-- Anon + authenticated: read all rows (gallery is public-facing)
create policy "gallery_images_select_all"
  on public.gallery_images
  for select
  using (true);

-- Staff + admin: insert / update / delete
create policy "gallery_images_write_staff"
  on public.gallery_images
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─── RLS policies: team_members ──────────────────────────────────────────────

-- Anon + authenticated: read all rows (team is shown on public About page)
create policy "team_members_select_all"
  on public.team_members
  for select
  using (true);

-- Staff + admin: insert / update / delete
create policy "team_members_write_staff"
  on public.team_members
  for all
  using (public.is_staff())
  with check (public.is_staff());
