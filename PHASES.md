# District Pour Haus — Build Phases

Full rebuild of districtpourhaus.com as a Next.js 15 + Supabase application with admin CMS, Untappd-driven tap list, and Printify-driven merch gallery.

**Tagline:** Our Haus is Your Haus
**Stack:** Next.js 15 (App Router, TS) · Tailwind v4 · shadcn/ui · Framer Motion · Supabase (Postgres + Auth + Storage + RLS) · Drizzle ORM · Resend · react-hook-form + zod · Vercel · Plausible
**Deploy target:** `staging.districtpourhaus.com` first, production cutover only after owner approval.

---

## Phase 0 — Foundation

**Goal:** Bootstrapped, deployable skeleton with all infra wired.

**Deliverables**
- Next.js 15 app initialized, TypeScript strict mode, ESLint + Prettier
- Tailwind v4 configured with design tokens placeholder
- shadcn/ui CLI initialized, base components installed
- Supabase project created (staging), env vars wired (`.env.local`, `.env.example`)
- Drizzle ORM configured against Supabase Postgres, initial migration tooling
- Resend account configured, API key wired
- Vercel project linked, preview deploys on PR
- Repo committed to GitHub with branch protection on `main`

**Agents:** `dph-architect` (decisions), `dph-backend` (infra setup)
**Skills:** `dph-scaffold`

**Exit criteria**
- `npm run dev` boots a blank Next.js page
- `npm run db:push` applies an empty Drizzle schema to Supabase
- Vercel preview deploy succeeds from a PR

---

## Phase 1 — Design System

**Goal:** Visual foundation. Every later phase pulls from these primitives.

**Deliverables**
- Color tokens: `#0E0E0F` base, `#C97B4A` copper, `#F5EFE6` cream, neutral scale, semantic tokens (`bg`, `fg`, `muted`, `accent`, etc.)
- Typography: Fraunces (display) + Inter (body), subsetted, fluid type scale
- Base components: Button, Input, Textarea, Select, Dialog, Sheet, Card, Badge, Toast, Tabs (shadcn-customized)
- Layout primitives: Container, Section, Stack, Grid
- Motion primitives: scroll-reveal wrapper, fade-in, stagger helpers (Framer Motion, respects `prefers-reduced-motion`)
- Iconography: Lucide
- Grain texture overlay, dark-first themed
- Storybook OR a `/styleguide` route for visual regression review

**Agents:** `dph-design` (visual decisions), `dph-frontend` (implementation)
**Skills:** `dph-component`

**Exit criteria**
- `/styleguide` renders every base component in dark theme with AA contrast verified
- Lighthouse accessibility score ≥ 95 on styleguide page

---

## Phase 2 — Public Marketing Site (mock data)

**Goal:** Every public page exists, styled, content-complete with placeholders. No DB wiring yet.

**Deliverables**
- Home (hero, tap counter, upcoming events strip, featured menu, hours/location card, IG feed slot, newsletter CTA)
- About (story, "Our Haus is Your Haus", team, self-pour with RFID cards explainer)
- Menu (food sections only, tabs)
- Taps (mock fixture rendering, filter by style/ABV)
- Events (calendar + list views)
- Reservations & Inquiries (unified form, type selector — not yet wired to DB)
- Gallery (masonry + lightbox)
- Merch (mock product grid, outbound link placeholder)
- Careers (positions list, application form shell)
- Contact / Directions (Mapbox map, hours, parking)
- Legal (Privacy, Terms)
- Global header + footer, mobile nav

**Agents:** `dph-frontend`, `dph-design`, `dph-content` (placeholder copy + SEO meta)
**Skills:** `dph-page`, `dph-component`

**Exit criteria**
- All routes render on mobile + desktop with placeholder data
- No console errors, no layout shift, Lighthouse perf ≥ 90 on each page
- Content reviewed for typos and brand voice

---

## Phase 3 — Admin & Auth Foundation

**Goal:** Locked-down admin shell with per-staff accounts and audit logging.

**Deliverables**
- Drizzle schema for: `profiles`, `audit_log`, `integrations`
- Supabase Auth (email + password), email confirmation enabled
- Row-Level Security policies: public read on published rows, admin/staff write
- Role enum: `admin` (full) and `staff` (limited — no integrations, no user management)
- Admin route group `(admin)` with middleware-guarded auth + role checks
- Admin shell: sidebar nav, top bar with user menu, breadcrumbs, dark theme matching public site
- `lib/audit.ts` helper: records every create/update/delete with diff, user_id, ip, ua, timestamp
- Login event tracking (every successful + failed login → audit log)
- Activity log viewer route (read-only, filter by user / entity / date range)

**Agents:** `dph-backend` (auth + RLS), `dph-admin` (shell)
**Skills:** `dph-migration`

**Exit criteria**
- Non-authenticated user redirected from `/admin`
- Two test accounts (one admin, one staff) created via Supabase dashboard, both can log in
- Login event appears in `audit_log` table
- Staff account cannot reach `/admin/integrations` or `/admin/users`

---

## Phase 4 — Admin CRUDs

**Goal:** Owner can manage every piece of content from the admin.

**Deliverables (in build order)**
1. Events admin shell — read-only status card at `/admin/events` linking out to the Untappd-for-Business dashboard. Events themselves are managed in Untappd; the public events page reads live from the Untappd API in Phase 6. Shared admin primitives (`ResourceTable`, `ResourceForm`) shipped alongside the card and are reused by every CRUD below.
2. Menu CRUD — sections + items with sort order, price, allergens, image, available toggle
3. Hours — weekly schedule (7 rows, day-of-week keyed: open/close/closed) **and** date-keyed overrides (open/close/closed with note). Both surfaces live on `/admin/hours`: weekly schedule form at the top, overrides table below. Weekly rows are seeded with current fixture values on first migration.
4. Content blocks — typed JSON editor for keys: `home_hero`, `about_body`, `home_callouts`, etc. Team members are NOT a content block — they live in deliverable 5 because they need a photo upload, not a URL field.
5. Gallery + team manager — reintroduces the signed-upload route + cover-image component on top of the existing `media` storage bucket, then ships TWO surfaces on top of it:
   - **Gallery** — upload, alt text, tags, drag-to-reorder
   - **Team** — CRUD for `team_members` (name, role, bio, photo) using the same upload primitive. Drag-to-reorder. Replaces the `lib/fixtures/team.ts` source on the public About page once Phase 5 wires the DB read.
6. Inquiries inbox — list view (filterable by type + status), detail view with status transitions (pending → confirmed/declined), notes field
7. Careers — postings CRUD + applicants list with resume download
8. Integrations panel (admin-only) — encrypted credential storage for Untappd (`location_id`, read & write token — covers both tap list AND events) and Printify (`api_key`, `shop_id`), test-connection buttons
9. Newsletter — subscriber list + CSV export
10. Activity log viewer — already built in Phase 3, polish + filtering

**Agents:** `dph-admin`, `dph-backend`
**Skills:** `dph-admin-crud`, `dph-migration`

**Exit criteria**
- Each CRUD passes manual test: create, read, update, delete, RLS-enforced
- All mutations write to `audit_log`
- Staff role can edit menu/hours/content/gallery/team/inquiries/careers; only admin can touch integrations + newsletter
- `/admin/events` renders the read-only Untappd link-out card (no CRUD here by design)

---

## Phase 5 — Public ↔ DB Wiring

**Goal:** Public site reads from Supabase. Admin edits show up on the live site within seconds.

**Deliverables**
- Replace all mock fixtures with RSC queries (Drizzle on server) — except events, which wire to Untappd in Phase 6, not to Supabase
- ISR with on-demand revalidation: admin save → `revalidateTag` call → public page refresh
- Hours endpoint: applies overrides on top of defaults, returns today's effective hours
- Menu: only items with `available = true`
- Inquiries form connected to DB (write path only — staff notify + auto-reply added in Phase 7)

**Agents:** `dph-frontend`, `dph-backend`
**Skills:** none new

**Exit criteria**
- Editing a menu item, hour override, or content block in admin updates the public page within 5 seconds
- No mock data references remain in `app/` outside `__fixtures__/` and the `/events` route (events come online in Phase 6)

---

## Phase 6 — External Integrations

**Goal:** Live tap list AND live events from Untappd, live merch from Printify, all server-fetched and cached.

**Deliverables**
- `lib/untappd.ts` — server-only fetcher used by BOTH the tap list and the events sync. Auth via the Untappd-for-Business read & write token (events endpoints require it). Normalizes menu + event JSON to internal types, graceful fallback to mock fixture when creds missing or upstream errors.
- `lib/printify.ts` — server-only fetcher, lists products from configured shop, normalizes to card data, links each to its Printify Pop-Up Store **product** URL (`/product/<id>/<handle>`)
- **Merch cache mirror.** Supabase `merch_products` table keyed by `printify_product_id`, columns for title, price_cents, category, tags, printify_url, image_path (mirrored into the `media` bucket), source_image_url (change-detection key), sort_order, visible, synced_at, deleted_at. RLS: public read of live rows; only service-role / Drizzle-owner writes. A scheduled `sync-merch` job (Vercel Cron, ~5 min) fetches Printify products, downloads each product image into Supabase Storage on first sight (skipping unchanged images via `source_image_url` equality), upserts the table, and soft-deletes removed products (and their storage objects). `/merch` reads from `merch_products` and serves images from our Supabase public URLs — no client-side Printify hits. Admin "Sync now" runs the same `runMerchSync()`.
- **Events cache mirror.** Supabase `events_cache` table keyed by `untappd_event_id`, columns for title, description, starts_at, ends_at, cover_image_url, external_url, synced_at. RLS: public read; only service-role writes. A scheduled job (Vercel Cron or `pg_cron`) hits Untappd every ~5 minutes and upserts the table. Removed-upstream events are soft-deleted via a `deleted_at` column so the public page filters them out without losing audit history.
- Public events page: `/events` reads from `events_cache` (filtering `deleted_at is null` and past events as derived from `ends_at`/`starts_at`). Cover images served from Untappd-hosted URLs, RSVP / detail links back to Untappd. No client-side Untappd hits; the cache is the only read path.
- "Live menu temporarily unavailable" banner UI when Untappd fetch fails (taps still show last-good cached data). Events page falls back gracefully to the last-known cache contents if the sync job has been failing for > 1 hour, with a small "Last updated …" line at the bottom of the page.
- Admin `/admin/events` link-out card surfaces the latest `synced_at` from `events_cache` and a count of upcoming events. No manual sync button — the cron owns refresh entirely.
- Admin integrations panel populates the credentials; toggle to switch between mock/live
- Loading + empty states for taps, events, and merch pages

**Agents:** `dph-integrations`, `dph-backend`, `dph-frontend`
**Skills:** `dph-migration` (for `events_cache` and `merch_products`)

**Exit criteria**
- With mock creds, `/taps`, `/events`, and `/merch` render fixture data
- With real creds in integrations panel, `/taps` renders live Untappd menu, `/events` renders live Untappd events with cover images sourced from `events_cache`, `/merch` renders live Printify products with images served from the `merch_products` mirror (Supabase Storage), not Printify's CDN
- A product added/changed in Printify appears on `/merch` within ~5 minutes via the `sync-merch` job; its image is mirrored into Supabase Storage once and reused on subsequent syncs (no re-download when unchanged)
- An event saved in the Untappd dashboard appears on `/events` within ~5 minutes via the scheduled sync — no admin action required
- Removing an event in Untappd flags the matching row `deleted_at` on the next sync; it disappears from `/events`
- Outage simulation: pausing the cron (or removing creds) does NOT blank the page — `/events` continues to serve the last-known cache; admin card surfaces the stale `synced_at` so staleness is visible

---

## Phase 7 — Forms & Email

**Goal:** Inquiry + careers forms send mail.

**Deliverables**
- Resend templates: staff-notification (with inquiry detail) and customer auto-reply ("we received your request, will confirm within X hours")
- Unified inquiry form server action: validates with zod, writes to DB, fires both emails, returns success state
- Careers application form: same pattern + resume upload to Supabase Storage, link in staff email
- Form spam protection: hCaptcha or Cloudflare Turnstile
- Newsletter signup wired (writes to `subscribers` table; broadcast send remains manual via Resend dashboard for now)

**Agents:** `dph-integrations`, `dph-frontend`
**Skills:** none new

**Exit criteria**
- Submitting the inquiry form writes a row to `inquiries`, sends staff email, sends auto-reply to customer
- Resume upload appears in Storage, linked in staff email
- Bot submissions blocked by captcha

---

## Phase 8 — SEO & Metadata

**Goal:** Restaurant ranks well for local search.

**Deliverables**
- Per-page metadata via Next `generateMetadata` (titles, descriptions, OG images)
- OG images: event pages use the live Untappd event image; all other pages use the District Pour Haus brand logo as the default OG image (falls back to the brand logo when an event has no Untappd image)
- JSON-LD structured data: `Restaurant` (sitewide), `Event` (per event), `Menu` (menu page)
- `sitemap.ts`, `robots.ts`
- Canonical URLs, no-index on admin routes
- Plausible analytics installed (privacy-friendly, no cookie banner needed)

**Agents:** `dph-content`, `dph-frontend`
**Skills:** none new

**Exit criteria**
- Google Rich Results Test validates Restaurant + Event JSON-LD
- Sitemap accessible at `/sitemap.xml`, contains all public pages + events
- Plausible dashboard receives pageviews from staging

---

## Phase 9 — Performance & Accessibility Polish

**Goal:** Production-grade.

**Deliverables**
- Image optimization audit (next/image everywhere, AVIF, blur placeholders)
- Font subsetting verified, no FOUT
- JS bundle audit, dynamic imports for heavy admin-only components
- Motion polish: hero parallax, scroll reveals, tap-counter ticker, all behind `prefers-reduced-motion`
- Full keyboard navigation tested, focus rings visible, skip-to-content link
- Screen reader sweep on every public page
- Color contrast audit (AA minimum)
- Lighthouse run on every public page: target ≥ 95 across Performance, Accessibility, Best Practices, SEO

**Agents:** `dph-qa`, `dph-design`, `dph-frontend`
**Skills:** none new

**Exit criteria**
- Lighthouse ≥ 95 across all four categories on Home, Menu, Taps, Events, Merch
- axe-core scan clean on every public page
- Manual keyboard run completes a full reservation form submit without a mouse

---

## Phase 10 — Staging Deploy & Owner Handoff

**Goal:** Owner can log in, manage content, see live updates.

**Deliverables**
- `staging.districtpourhaus.com` live on Vercel
- Production environment ready (separate Supabase project, env vars set, domain pre-configured but not yet pointed)
- Admin docs: short Loom-style walkthrough OR written guide for events, menu, hours, integrations, inquiries
- Two real admin accounts provisioned (owner + manager)
- Monitoring: Vercel Analytics + error logging (Sentry optional)
- Backup strategy documented for Supabase

**Agents:** `dph-architect` (final review), `dph-qa` (sign-off)
**Skills:** `dph-deploy-staging`

**Exit criteria**
- Owner successfully logs into staging admin, creates a test event, sees it appear on the public site
- Owner approves production cutover
- DNS swap planned with rollback path

---

## Phase Dependencies

```
Phase 0
  └─ Phase 1
       └─ Phase 2 ──┐
                    │
       └─ Phase 3 ──┤
            └─ Phase 4 ──┐
                         │
                         └─ Phase 5
                              └─ Phase 6
                                   └─ Phase 7
                                        └─ Phase 8
                                             └─ Phase 9
                                                  └─ Phase 10
```

Phases 2 and 3 can run in parallel after Phase 1.

---

## Working Rules

- Every task is delegated to the agent listed for that phase via the `Agent` tool. The orchestrator (main thread) plans and reviews; it does not implement directly.
- Skills are invoked for repeatable operations (scaffolding, new component, new CRUD, new migration, deploy).
- Every phase ends with an explicit owner-visible deliverable and exit criteria check before the next phase starts.
- Each phase produces a PR against `main` with a description matching the phase deliverables.
