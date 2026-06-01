-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0022: events_cache RLS and trigger
-- Applies after the schema migration 0021.
-- No write policies — service role bypasses RLS for all writes (upserts and
-- soft-deletes are performed via createAdminClient() in the query layer).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger events_cache_set_updated_at
  before update on public.events_cache
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.events_cache enable row level security;

-- ─── RLS policies: events_cache ──────────────────────────────────────────────

-- Anon + authenticated: read non-deleted rows only.
-- No insert / update / delete policy — all writes go through the service-role
-- admin client which bypasses RLS entirely.
create policy "events_cache_select_all"
  on public.events_cache
  for select
  using (deleted_at is null);
