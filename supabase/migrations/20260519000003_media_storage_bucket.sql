-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0003: Shared media storage bucket and RLS policies
-- Creates the public-read 'media' bucket used by Gallery and future features.
-- All helper functions (is_staff, is_admin) defined in migration 0001.
-- ─────────────────────────────────────────────────────────────────────────────

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
