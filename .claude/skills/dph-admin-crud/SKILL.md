---
name: dph-admin-crud
description: Generate a complete admin CRUD section for a single Drizzle entity in the District Pour Haus admin. Use when adding management UI for events, menu items, hours overrides, gallery images, careers postings, etc. Produces list page, create page, edit page, server actions, validators, audit-log integration, and role-gated access. Pairs with dph-migration for the schema.
---

# dph-admin-crud

Creates a full CRUD section in `app/(admin)/<entity>/` for a Drizzle entity.

## Prerequisites

- The entity table exists in `lib/db/schema.ts` with RLS policies (use `dph-migration` first if not).
- The shared `<ResourceTable>` and `<ResourceForm>` primitives exist in `components/admin/`.

## When to invoke

Each Phase 4 deliverable: events, menu, hours, content, gallery, inquiries, careers, integrations, newsletter.

## Steps

1. **Create the zod schema.** `lib/validators/<entity>.ts` — define `create<Entity>Schema` and `update<Entity>Schema`. Export inferred types.
2. **Write query helpers.** `lib/db/queries/<entity>.ts` — `list`, `getById`, `create`, `update`, `remove`, all typed. Include a `published`-aware variant for public reads.
3. **Write server actions.** `app/(admin)/<entity>/actions.ts` — `createAction`, `updateAction`, `deleteAction`. Each must:
   - Verify caller role via `getSession()` helper
   - Validate input with the zod schema
   - Call the query helper
   - Write to `audit_log` via `recordAudit({ action, entity, entity_id, diff })`
   - Call `revalidateTag('<entity>')` on success
   - Return `{ ok: true }` or `{ ok: false, error }`
4. **List page.** `app/(admin)/<entity>/page.tsx` — uses `<ResourceTable>`, supports filtering + search, role-checked.
5. **Create page.** `app/(admin)/<entity>/new/page.tsx` — uses `<ResourceForm>` with `createAction`.
6. **Edit page.** `app/(admin)/<entity>/[id]/page.tsx` — fetches the row server-side, passes to `<ResourceForm>` with `updateAction`.
7. **Delete flow.** Confirm dialog → calls `deleteAction` → optimistic remove from list.
8. **Role gate.** If admin-only (e.g. integrations, newsletter), wrap the route group in a server-side role check that 404s for staff.
9. **Audit verification.** After implementing, simulate a create+update+delete and confirm three rows appear in `audit_log`.

## Conventions

- Forms use react-hook-form + zod resolver, same schema as the server action.
- Image upload goes to Supabase Storage via signed upload URLs, never proxied.
- Sort order on tables defaults to most-recent-first, configurable.
- Empty states are explicit ("No events yet. Create one →") with the primary CTA.

## Done criteria

- All four operations (C/R/U/D) work end-to-end via the UI
- RLS prevents an unauthenticated client from calling the actions
- Three corresponding `audit_log` rows appear per create+update+delete cycle
- Staff role cannot access admin-only entities
- Editing a row triggers a revalidation that updates the public page within 5 seconds
