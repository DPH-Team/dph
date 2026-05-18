# District Pour Haus — Project Instructions

This is a full Next.js 15 + Supabase rebuild of districtpourhaus.com. See `PHASES.md` for the phased build plan.

## Core working rule — agents and skills are mandatory

**Every implementation task in this project must be delegated to a project-specific subagent.** The main thread orchestrates: plans, asks the user clarifying questions when blocked, reviews subagent output, and decides when to advance phases. The main thread does not write feature code directly.

When a task matches one of these domains, delegate to the matching agent via the `Agent` tool with `subagent_type`:

| Domain | Agent | Model |
|---|---|---|
| High-level architecture, schema design, integration approach, phase reviews | `dph-architect` | opus |
| Visual design decisions, design system, motion, brand polish | `dph-design` | opus |
| Public-facing Next.js pages, React components, Tailwind, motion | `dph-frontend` | sonnet |
| Supabase, Drizzle, RLS, server actions, API routes, auth wiring | `dph-backend` | sonnet |
| Admin CRUDs, admin shell, audit logging | `dph-admin` | sonnet |
| Untappd, Printify, Resend, third-party API plumbing | `dph-integrations` | sonnet |
| Lighthouse, axe, manual a11y/perf review, exit-criteria sign-off | `dph-qa` | sonnet |
| Placeholder copy, SEO metadata, JSON-LD, OG copy | `dph-content` | haiku |

When a task matches one of these repeatable operations, invoke the skill via the `Skill` tool:

| Operation | Skill |
|---|---|
| Bootstrap or extend the Next.js project shell | `dph-scaffold` |
| Add a new reusable UI component | `dph-component` |
| Add a new public page following project conventions | `dph-page` |
| Add a new admin CRUD section | `dph-admin-crud` |
| Create + apply a Drizzle migration | `dph-migration` |
| Deploy to the staging environment | `dph-deploy-staging` |

## Boundaries

- **Do not start a phase before the previous phase's exit criteria are met.**
- **Do not implement features that aren't in `PHASES.md`.** If scope changes, update `PHASES.md` first and confirm with the user.
- **Do not skip RLS, audit logging, or auth checks** on admin work, even for prototypes.
- **Mock data is acceptable only in Phase 2.** Phase 5 onward must hit Supabase.
- **Every admin mutation writes to `audit_log`.** No exceptions.

## Brand

- Tagline: **Our Haus is Your Haus**
- Self-pour mechanism: **RFID cards** (not wristbands)
- Color base: `#0E0E0F` · accent copper: `#C97B4A` · cream: `#F5EFE6`
- Display font: Fraunces · Body: Inter

## Deploy

- Staging first: `staging.districtpourhaus.com`
- Production cutover only after owner approves the staging build.
