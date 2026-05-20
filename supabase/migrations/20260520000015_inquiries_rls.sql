-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0015: inquiries RLS, triggers, and cross-schema FKs
-- Applies after 20260520000014_inquiries_schema.sql which creates the
-- inquiries table (alongside the inquiry_type and inquiry_status enums).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FK (Drizzle cannot reference auth schema) ──────────────────

alter table public.inquiries
  add constraint inquiries_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.inquiries enable row level security;

-- ─── RLS policies: inquiries ─────────────────────────────────────────────────

-- Anon + authenticated visitors may INSERT their own inquiry.
-- WITH CHECK enforces: consent must be true and status must arrive as 'pending'.
-- This is defense-in-depth alongside the zod validator in the public form action.
create policy "inquiries_insert_anon"
  on public.inquiries
  for insert
  to anon, authenticated
  with check (consent = true and status = 'pending');

-- Only staff (admin or staff role) may read inquiry rows.
-- These are private contact records — never public-readable.
create policy "inquiries_select_staff"
  on public.inquiries
  for select
  using (public.is_staff());

-- Only staff may update inquiry rows (status transitions, internal_notes, etc.).
create policy "inquiries_update_staff"
  on public.inquiries
  for update
  using (public.is_staff())
  with check (public.is_staff());

-- Only staff may delete inquiry rows (spam cleanup).
create policy "inquiries_delete_staff"
  on public.inquiries
  for delete
  using (public.is_staff());
