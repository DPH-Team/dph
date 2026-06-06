---
name: dph-migration
description: Create and apply a Drizzle migration for the District Pour Haus database. Use when adding or modifying a table, enum, or RLS policy. Enforces the project rule that every table ships with RLS policies and standard timestamp columns. Handles schema edit, migration generation, RLS migration authoring, push, and verification.
---

# dph-migration

Creates a schema change + the matching migration files.

## When to invoke

- Adding a new table, column, enum, or index
- Modifying an existing column
- Adding or revising RLS policies
- Adding triggers (e.g. updated_at touch)

## Project invariants

- Every table includes: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- Every table has RLS enabled and at least one SELECT and one write policy.
- Sensitive credential columns use `pgcrypto` or Supabase Vault (NOT plain text).
- Public-facing reads filter on `published = true` where applicable.
- Migrations live in `supabase/migrations/` as a single timestamped sequence (Drizzle-generated SQL and hand-written RLS/trigger/helper SQL share this directory and are applied together by the Supabase CLI). `lib/db/migrations/` is NOT used.

## Steps

1. **Edit `lib/db/schema.ts`.** Add or modify the table definition using Drizzle syntax. Include the standard timestamp columns.
2. **Add a Postgres trigger for `updated_at`** if creating a new table. Use the project's shared `public.set_updated_at()` function — already defined in `supabase/migrations/20260519000001_rls_triggers_and_helpers.sql`. Do NOT redefine it.
3. **Generate the migration:** `npm run db:generate`. Drizzle writes the SQL into `supabase/migrations/` under a fresh timestamp. Inspect and edit it as needed.
4. **Write a companion RLS + policies block.** Same folder, named `<timestamp>_rls_<entity>.sql` (or appended to the same file if small). Use the project's `public.is_staff()` helper (already defined in the initial migrations) rather than re-querying `profiles`. Include:
   ```sql
   alter table public.<entity> enable row level security;

   create policy "<entity>_public_read"
     on public.<entity> for select
     to anon, authenticated
     using (published = true);  -- or appropriate condition

   create policy "<entity>_staff_read_all"
     on public.<entity> for select
     to authenticated
     using (public.is_staff());

   create policy "<entity>_staff_write"
     on public.<entity> for all
     to authenticated
     using (public.is_staff())
     with check (public.is_staff());
   ```
   Adjust roles per entity (e.g. integrations + newsletter = admin only — use `public.is_admin()`). NOTE: `profiles.id` is the user PK (it references `auth.users(id)`); there is no `profiles.user_id` column.
5. **Apply — LOCAL ONLY.** Apply against the local Supabase stack: `supabase start` then `npm run db:reset` (recreates the local DB from all migrations + RLS/triggers), or `npm run db:push` (Drizzle DDL only → 127.0.0.1 via `DATABASE_URL`).
   **🚫 NEVER run `supabase db push` or any command that targets the linked/remote project.** `supabase db push` applies migrations to the **remote production** Supabase and is FORBIDDEN. A PreToolUse hook (`.claude/hooks/block-remote-db-push.py`) hard-blocks it. The remote/production database is changed ONLY by the user during an explicitly-approved deploy — never by an agent or skill. If a migration needs to reach production, STOP and ask the user.
6. **Verify:** connect via `npm run db:studio` OR query `pg_policies` to confirm policies are present:
   ```sql
   select tablename, policyname, cmd from pg_policies where tablename = '<entity>';
   ```
7. **Test as anon:** with the anon Supabase key, attempt a write — should fail. Attempt a read of unpublished rows — should return empty.
8. **Update query helpers** in `lib/db/queries/<entity>.ts` if the column shape changed.

## Done criteria

- Migration file exists and was applied
- `pg_policies` query returns the expected SELECT + write policies
- Anon write rejected, anon read returns only published rows
- `npm run typecheck` passes after schema changes
