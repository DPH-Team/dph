---
name: dph-deploy-staging
description: Deploy the District Pour Haus app to the staging environment on Vercel at staging.districtpourhaus.com. Use at the end of each phase to push a verified build, and at end of Phase 10 for owner handoff. Handles env-var sync, build verification, deploy, smoke test, and ownership tagging.
---

# dph-deploy-staging

Pushes a verified build to staging.

## Preconditions

- Phase exit criteria are confirmed pass by `dph-qa`.
- `main` branch is clean and up to date with the merged PR.
- Vercel project is linked (`vercel link`).
- Staging Supabase project exists, separate from production.
- DNS for `staging.districtpourhaus.com` points at Vercel.

## Steps

1. **Sync env vars.** Run `vercel env pull .env.staging` and verify the staging vars are complete: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL=https://staging.districtpourhaus.com`. If any vars are missing, add via `vercel env add <name> preview` (or `production` for the staging-promoted alias).
2. **Apply pending migrations to the staging DB.** Use `drizzle-kit migrate` against the staging `DATABASE_URL`.
3. **Local build verify.** `npm run build` exits 0.
4. **Deploy.** `vercel deploy --prebuilt` after `vercel build`, OR push to the `main` branch if auto-deploy is configured.
5. **Promote.** `vercel alias set <deploy-url> staging.districtpourhaus.com`.
6. **Smoke test the live URL.** Hit each public route, confirm 200 + key content present (curl or WebFetch). Confirm `/admin` redirects to login.
7. **Seed if first deploy of a phase.** Run seed script if data is needed (events, sample inquiries) — only on staging, never production.
8. **Tag the deploy.** Create a git tag `staging-phase-<N>-YYYY-MM-DD` and push.
9. **Post in the agreed channel.** Drop the staging URL + a short changelog for the owner.

## Smoke-test routes

- `/` — 200, hero rendered
- `/menu` — 200
- `/taps` — 200, mock or live data
- `/events` — 200
- `/reservations` — 200, form interactive
- `/gallery` — 200
- `/merch` — 200, products or graceful empty
- `/contact` — 200, form interactive
- `/admin` — 307/302 redirect to login when not authed

## Done criteria

- All smoke-test routes pass
- Owner has the URL and login credentials for a test admin account
- Deploy tagged in git
- No errors in Vercel logs for the first 5 minutes after deploy
