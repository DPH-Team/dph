---
name: dph-scaffold
description: Bootstrap or extend the District Pour Haus Next.js project shell. Use when starting Phase 0, when adding a new top-level concern (auth, ORM, email), or when a dependency upgrade requires re-running setup. Performs Next.js init, Tailwind v4 setup, shadcn/ui init, Supabase client, Drizzle config, env scaffolding, ESLint/Prettier, and the standard directory layout.
---

# dph-scaffold

Bootstraps or extends the District Pour Haus project skeleton. Idempotent — safe to re-run.

## When to invoke

- Phase 0 initial bootstrap
- Adding a new infra concern (Resend, Stripe, etc.)
- Onboarding a new dev workstation

## Standard directory layout

```
app/
  (public)/            # public marketing routes
  (admin)/             # role-gated admin routes
  api/                 # webhooks + external callbacks only
  globals.css
  layout.tsx
components/
  ui/                  # shadcn primitives
  marketing/           # public-site composed components
  admin/               # admin composed components
  motion/              # framer-motion wrappers
lib/
  db/
    schema.ts
    queries/
    migrations/
  supabase/
    client.ts          # browser client
    server.ts          # server client
    admin.ts           # service-role client (server-only)
  audit.ts             # audit-log helper
  untappd.ts
  printify.ts
  email/
    templates/
    send.ts
  utils.ts
  validators/          # zod schemas shared client+server
public/
  fonts/
  images/
drizzle.config.ts
.env.example
.env.local             # gitignored
```

## Steps

1. Verify the working directory is `/Users/cjsmith/code/dph` and is empty or matches the layout above.
2. Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --turbopack --import-alias "@/*"` (skip if already initialized).
3. Install runtime deps: `npm i @supabase/supabase-js @supabase/ssr drizzle-orm postgres zod react-hook-form @hookform/resolvers framer-motion lucide-react resend @react-email/components @react-email/render`
4. Install dev deps: `npm i -D drizzle-kit @types/node prettier prettier-plugin-tailwindcss eslint-config-prettier`
5. Initialize shadcn/ui: `npx shadcn@latest init -d` (dark theme, neutral base; we override tokens after)
6. Install base shadcn components: `npx shadcn@latest add button input textarea select dialog sheet card badge toast tabs form label dropdown-menu separator`
7. Create directory layout per the tree above (`mkdir -p ...`).
8. Write `drizzle.config.ts` pointing at `lib/db/schema.ts` and Supabase `DATABASE_URL`.
9. Write `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts` using `@supabase/ssr`.
10. Write `.env.example` with: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`.
11. Write `prettier.config.js` with `prettier-plugin-tailwindcss`.
12. Add `npm` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:generate` (drizzle-kit generate), `db:push`, `db:studio`.
13. Run `npm run build` to verify the skeleton compiles.
14. Initialize git if not already, commit as `chore: phase 0 scaffold`.

## Done criteria

- `npm run dev` boots a blank index page on `http://localhost:3000`
- `npm run typecheck` exits 0
- `npm run db:push` would apply an empty schema (no migration written yet, but config resolves)
- `.env.example` complete
- Directory tree matches the layout above
