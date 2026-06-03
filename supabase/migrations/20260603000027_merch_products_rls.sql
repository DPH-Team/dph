-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0027: merch_products RLS and trigger
-- Applies after the schema migration 0026.
-- No write policies — all writes (upsert + soft-delete) are performed by the
-- merch sync cron via the Drizzle `db` client, which connects as the pooler
-- `postgres` owner role and bypasses RLS by table ownership.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger merch_products_set_updated_at
  before update on public.merch_products
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.merch_products enable row level security;

-- ─── RLS policies: merch_products ────────────────────────────────────────────

-- Anon + authenticated: read non-deleted, visible rows only.
-- No insert / update / delete policy — all writes go through the merch sync
-- cron via the Drizzle `db` client (postgres owner role, bypasses RLS).
create policy "merch_products_select_all"
  on public.merch_products
  for select
  using (deleted_at is null and visible = true);
