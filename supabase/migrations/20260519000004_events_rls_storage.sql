-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0004: Events RLS, indexes, FKs, trigger, and shared media bucket
-- Applies after 20260519000003_events_schema.sql (Drizzle-generated DDL).
-- All functions (set_updated_at, is_staff, is_admin) defined in migration 0001.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Slug uniqueness (case-insensitive) ───────────────────────────────────────

create unique index events_slug_lower_unique on public.events (lower(slug));

-- ─── FKs to auth.users (Drizzle cannot emit cross-schema refs) ───────────────

alter table public.events
  add constraint events_created_by_fk
    foreign key (created_by) references auth.users(id) on delete set null,
  add constraint events_updated_by_fk
    foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at trigger (reuses function from migration 0001) ─────────────────

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.events enable row level security;

create policy "events_public_read"
  on public.events for select
  to anon, authenticated
  using (published = true);

create policy "events_staff_read_all"
  on public.events for select
  to authenticated
  using (public.is_staff());

create policy "events_staff_write"
  on public.events for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ─── Indexes for common queries ───────────────────────────────────────────────

create index events_starts_at_idx on public.events (starts_at);

create index events_published_featured_starts_at_idx
  on public.events (published, featured desc, starts_at)
  where published = true;

-- ─── Storage: shared media bucket (public-read) ───────────────────────────────

insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

create policy "media_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "media_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_staff());

create policy "media_staff_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_staff());

create policy "media_staff_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_staff());
