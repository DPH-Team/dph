/**
 * DIAGNOSTIC PAGE — remove once bug is identified.
 *
 * Route: /admin/menu/sections/new-direct
 *
 * Purpose: isolate which layer in the Server Action 404 chain is broken.
 * Two independent form surfaces are provided:
 *
 *   Surface A — pings a minimal, import-free action (_test-action.ts).
 *     - 404 here → the route group itself cannot register actions (H2).
 *     - Works → imports in actions.ts or the prop-threading chain is the culprit.
 *
 *   Surface B — binds createMenuSectionAction directly to a <form>, bypassing
 *     SectionForm and ResourceForm entirely (no prop-threading, no useActionState).
 *     - Same 404 as the production route → H1/H3 are cleared; the bug is
 *       upstream of how the action is consumed.
 *     - Works (redirect fires or prev-arg error surfaces) → the
 *       SectionForm → ResourceForm → useActionState prop chain is the culprit (H3).
 *
 * Note: Surface B passes createMenuSectionAction as (formData) => …
 * The first argument (_prev) will be undefined. The action guards against that
 * via zod.safeParse so it won't crash — it may return a field-error response.
 * We only care whether Next.js can FIND the action by ID, not whether it
 * processes the form correctly.
 */

import { requireStaff } from '@/lib/auth';
import {
  createMenuSectionAction,
  bisectInFileNoop,
} from '@/app/(admin)/admin/menu/actions';
import { pingAction } from '@/app/(admin)/admin/menu/_test-action';
import { bisectAuthAction } from '@/app/(admin)/admin/menu/_bisect-auth';
import { bisectDbAction } from '@/app/(admin)/admin/menu/_bisect-db';
import { bisectAuditAction } from '@/app/(admin)/admin/menu/_bisect-audit';
import { bisectValidatorsAction } from '@/app/(admin)/admin/menu/_bisect-validators';

export default async function NewDirectDiagnosticPage() {
  await requireStaff();

  return (
    <div className="space-y-10 max-w-xl p-6">
      <header>
        <h1 className="text-lg font-semibold">Server Action Diagnostic</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This page is a temporary diagnostic. Remove it once the bug is
          identified.
        </p>
      </header>

      {/* ── Surface A: minimal action, no external imports ── */}
      <section className="space-y-3 border border-border rounded p-4">
        <h2 className="text-sm font-semibold">
          Surface A — pingAction (minimal, no dependencies)
        </h2>
        <p className="text-xs text-muted-foreground">
          If this 404s, no action in this route group can be registered (H2).
          If it works (even with an error), H2 is cleared.
        </p>
        {/* Direct <form action> binding — no useActionState, no prop threading */}
        <form
          action={pingAction as unknown as (formData: FormData) => void}
          className="space-y-2"
        >
          <input
            name="name"
            defaultValue="ping-test"
            className="border px-2 py-1 text-sm w-full"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded"
          >
            Submit ping
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Expected: check terminal for{' '}
          <code>[pingAction] ran — name= ping-test</code>
        </p>
      </section>

      {/* ── Surface B: real action, direct binding, no client wrappers ── */}
      <section className="space-y-3 border border-border rounded p-4">
        <h2 className="text-sm font-semibold">
          Surface B — createMenuSectionAction (direct binding, no prop chain)
        </h2>
        <p className="text-xs text-muted-foreground">
          If Surface A works but this 404s, the bug is inside actions.ts itself
          (imports, the listSections re-export, or module evaluation). If this
          works (redirect or zod error), the prop chain through
          SectionForm/ResourceForm/useActionState is the culprit (H3).
        </p>
        {/*
          Cast is intentional: createMenuSectionAction is (prev, formData) but
          <form action> only passes formData. _prev will be undefined.
          The action's zod guard handles that — we only care if Next.js finds it.
        */}
        <form
          action={
            createMenuSectionAction as unknown as (formData: FormData) => void
          }
          className="space-y-2"
        >
          <input
            name="name"
            defaultValue="Diagnostic test section"
            className="border px-2 py-1 text-sm w-full"
          />
          <input type="hidden" name="sortOrder" value="0" />
          <input type="hidden" name="available" value="true" />
          <input type="hidden" name="description" value="" />
          <button
            type="submit"
            className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded"
          >
            Submit direct
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Expected: a redirect to /admin/menu/sections/[id] (success) or a zod
          validation error response (also confirms the action was found).
        </p>
      </section>
      {/* ── Bisect tests ── */}
      <section className="space-y-4 border border-border rounded p-4">
        <h2 className="text-sm font-semibold">Bisect tests</h2>
        <p className="text-xs text-muted-foreground">
          Each button targets a separate action file that imports exactly one
          rich dependency. Click each and note whether it returns 200 or 404.
          This isolates which import breaks server action registration.
        </p>

        {/* Bisect 1: in-file noop (lives inside actions.ts — all imports present) */}
        <form
          action={bisectInFileNoop as unknown as (formData: FormData) => void}
          className="space-y-1"
        >
          <button
            type="submit"
            className="bg-secondary text-secondary-foreground text-sm px-3 py-1 rounded w-full text-left"
          >
            Bisect 1: in-file noop (actions.ts — all imports loaded)
          </button>
        </form>

        {/* Bisect 2: auth import only */}
        <form
          action={bisectAuthAction as unknown as (formData: FormData) => void}
          className="space-y-1"
        >
          <button
            type="submit"
            className="bg-secondary text-secondary-foreground text-sm px-3 py-1 rounded w-full text-left"
          >
            Bisect 2: auth import only (lib/auth → server-only + next/headers)
          </button>
        </form>

        {/* Bisect 3: db import only */}
        <form
          action={bisectDbAction as unknown as (formData: FormData) => void}
          className="space-y-1"
        >
          <button
            type="submit"
            className="bg-secondary text-secondary-foreground text-sm px-3 py-1 rounded w-full text-left"
          >
            Bisect 3: db import only (lib/db/queries/menu → postgres() at load)
          </button>
        </form>

        {/* Bisect 4: audit import only */}
        <form
          action={bisectAuditAction as unknown as (formData: FormData) => void}
          className="space-y-1"
        >
          <button
            type="submit"
            className="bg-secondary text-secondary-foreground text-sm px-3 py-1 rounded w-full text-left"
          >
            Bisect 4: audit import only (lib/audit → server-only + supabase/admin)
          </button>
        </form>

        {/* Bisect 5: validators import only */}
        <form
          action={
            bisectValidatorsAction as unknown as (formData: FormData) => void
          }
          className="space-y-1"
        >
          <button
            type="submit"
            className="bg-secondary text-secondary-foreground text-sm px-3 py-1 rounded w-full text-left"
          >
            Bisect 5: validators import only (lib/validators/menu → zod only)
          </button>
        </form>
      </section>
    </div>
  );
}
