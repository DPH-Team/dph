-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0017: careers RLS, triggers, cross-schema FKs, and storage bucket
-- Applies after 20260522000016_careers_schema.sql which creates the
-- career_postings and career_applications tables (alongside the employment_type
-- and application_status enums).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FKs (Drizzle cannot reference auth schema) ─────────────────

alter table public.career_postings
  add constraint career_postings_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.career_postings
  add constraint career_postings_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

alter table public.career_applications
  add constraint career_applications_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── posting_id FK (within public schema — Drizzle omitted it because the
-- table order in the generated migration put career_applications before
-- career_postings, so we add it here) ────────────────────────────────────────

alter table public.career_applications
  add constraint career_applications_posting_id_fkey
  foreign key (posting_id) references public.career_postings(id) on delete set null;

-- ─── updated_at triggers (using existing public.set_updated_at()) ─────────────

create trigger career_postings_set_updated_at
  before update on public.career_postings
  for each row execute procedure public.set_updated_at();

create trigger career_applications_set_updated_at
  before update on public.career_applications
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.career_postings enable row level security;
alter table public.career_applications enable row level security;

-- ─── RLS policies: career_postings ───────────────────────────────────────────

-- Public (anon + authenticated) may read open postings only.
create policy "career_postings_select_open"
  on public.career_postings
  for select
  to anon, authenticated
  using (is_open = true);

-- Staff sees all postings regardless of is_open.
create policy "career_postings_select_staff_all"
  on public.career_postings
  for select
  using (public.is_staff());

-- Staff may insert new postings.
create policy "career_postings_insert_staff"
  on public.career_postings
  for insert
  to authenticated
  with check (public.is_staff());

-- Staff may update any posting.
create policy "career_postings_update_staff"
  on public.career_postings
  for update
  using (public.is_staff())
  with check (public.is_staff());

-- Staff may delete postings (applications survive due to ON DELETE SET NULL).
create policy "career_postings_delete_staff"
  on public.career_postings
  for delete
  using (public.is_staff());

-- ─── RLS policies: career_applications ───────────────────────────────────────

-- Anon + authenticated visitors may INSERT their own application.
-- WITH CHECK enforces: consent must be true and status must arrive as 'new'.
-- This is defense-in-depth alongside the zod validator in the Phase 7 form action.
create policy "career_applications_insert_anon"
  on public.career_applications
  for insert
  to anon, authenticated
  with check (consent = true and status = 'new');

-- Only staff may read application rows — applicant data is private.
create policy "career_applications_select_staff"
  on public.career_applications
  for select
  using (public.is_staff());

-- Only staff may update application rows (status, internal_notes, etc.).
create policy "career_applications_update_staff"
  on public.career_applications
  for update
  using (public.is_staff())
  with check (public.is_staff());

-- Only staff may delete application rows.
create policy "career_applications_delete_staff"
  on public.career_applications
  for delete
  using (public.is_staff());

-- ─── Storage: private applications bucket ────────────────────────────────────
--
-- Resumes must NEVER be publicly readable.
-- Anon insert is allowed so the Phase 7 public form action can upload without
-- needing a service-role key on the client path.
-- Staff read/update/delete use admin-client signed URLs in the server action layer.

insert into storage.buckets (id, name, public)
  values ('applications', 'applications', false)
  on conflict (id) do nothing;

-- Anon + authenticated may upload resumes (public form action path).
create policy "applications_bucket_insert_anon"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'applications');

-- Staff may read objects (via admin-client signed download URL helper).
create policy "applications_bucket_select_staff"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'applications' and public.is_staff());

-- Staff may update objects (e.g., replace a resume).
create policy "applications_bucket_update_staff"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'applications' and public.is_staff());

-- Staff may delete objects (on application delete or spam cleanup).
create policy "applications_bucket_delete_staff"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'applications' and public.is_staff());
