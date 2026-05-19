/**
 * scripts/seed-users.ts
 *
 * Provisions Phase 3 test accounts (admin + staff) in Supabase Auth and
 * syncs their public.profiles rows.
 *
 * Usage:
 *   npm run db:seed
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service-role key (bypasses RLS)
 *
 * Optional env vars (all have documented defaults):
 *   SEED_ADMIN_EMAIL      default: admin@districtpourhaus.test
 *   SEED_ADMIN_PASSWORD   default: dph-admin-dev-pass
 *   SEED_STAFF_EMAIL      default: staff@districtpourhaus.test
 *   SEED_STAFF_PASSWORD   default: dph-staff-dev-pass
 *   SEED_ALLOW_PROD       set to "1" to override the production-guard
 *   NEXT_PUBLIC_SITE_URL  used in the final summary (fallback: http://localhost:3000)
 *
 * Note: lib/supabase/admin.ts imports 'server-only' which throws outside the
 * Next.js runtime. We therefore inline the service-role client here rather
 * than importing from that module.
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Load .env.local before anything else ─────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@districtpourhaus.test';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'dph-admin-dev-pass';
const STAFF_EMAIL = process.env.SEED_STAFF_EMAIL ?? 'staff@districtpourhaus.test';
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'dph-staff-dev-pass';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const ALLOW_PROD = process.env.SEED_ALLOW_PROD === '1';

// ── Production guard ──────────────────────────────────────────────────────────

/**
 * Returns true when the URL looks like a production Supabase project.
 * We allow localhost, 127.0.0.1, and any URL containing "staging".
 * Everything else is treated as production.
 */
function looksLikeProduction(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    !lower.includes('localhost') &&
    !lower.includes('127.0.0.1') &&
    !lower.includes('staging')
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fail(message: string): never {
  process.stderr.write(`\nError: ${message}\n`);
  process.exit(1);
}

/**
 * Creates a service-role Supabase client. Intentionally does NOT import from
 * lib/supabase/admin.ts because that module starts with `import 'server-only'`
 * which throws when executed outside the Next.js runtime.
 */
function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface AccountSpec {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'staff';
}

interface ProfileRow {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
}

// ── Core provisioning logic ───────────────────────────────────────────────────

async function upsertUser(
  supabase: SupabaseClient,
  spec: AccountSpec,
): Promise<string> {
  // 1. Check whether the user already exists in auth.users.
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    fail(`Failed to list auth users: ${listError.message}`);
  }

  const existing = listData.users.find((u) => u.email === spec.email);

  let userId: string;

  if (existing) {
    // 2a. User exists — update password so re-runs re-assert known credentials.
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existing.id,
      { password: spec.password },
    );
    if (updateError) {
      fail(`Failed to update password for ${spec.email}: ${updateError.message}`);
    }
    userId = existing.id;
    console.log(`  • ${spec.email} already exists — password re-asserted.`);
  } else {
    // 2b. User does not exist — create it. The handle_new_auth_user trigger
    //     fires on INSERT into auth.users and creates a profiles row with
    //     role = 'staff'.
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: { full_name: spec.fullName },
    });
    if (createError) {
      fail(`Failed to create user ${spec.email}: ${createError.message}`);
    }
    userId = createData.user.id;
    console.log(`  • ${spec.email} created (id: ${userId}).`);
  }

  // 3. Sync the profiles row — set full_name, and promote to admin if needed.
  //    The prevent_self_role_promotion trigger allows this UPDATE because
  //    auth.uid() IS NULL under the service-role connection (see migration 0002).
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: spec.fullName, role: spec.role })
    .eq('id', userId);

  if (profileError) {
    fail(
      `Failed to update profile for ${spec.email}: ${profileError.message}\n` +
        'Hint: if this is a role-change error, ensure migration 0002 has been applied.',
    );
  }

  return userId;
}

// ── Sanity verification ───────────────────────────────────────────────────────

async function verifyProfiles(
  supabase: SupabaseClient,
  ids: string[],
  expectedMap: Map<string, { email: string; role: string }>,
): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .in('id', ids);

  if (error) {
    fail(`Verification query failed: ${error.message}`);
  }

  const rows = (data ?? []) as ProfileRow[];

  // Print a small table.
  console.log('\n  Verification:');
  console.log('  ─────────────────────────────────────────────────────────');
  console.log('  email                                role       full_name');
  console.log('  ─────────────────────────────────────────────────────────');
  for (const row of rows) {
    console.log(
      `  ${row.email.padEnd(36)} ${row.role.padEnd(10)} ${row.full_name ?? '(unset)'}`,
    );
  }
  console.log('  ─────────────────────────────────────────────────────────');

  // Confirm all expected profiles are present and correct.
  for (const [id, expected] of expectedMap.entries()) {
    const row = rows.find((r) => r.id === id);
    if (!row) {
      fail(
        `Profile row missing for ${expected.email} (id: ${id}).\n` +
          'This usually means the handle_new_auth_user trigger did not fire.\n' +
          'Check that migration 0001 (0001_rls_triggers_and_helpers.sql) has been applied.',
      );
    }
    if (row.role !== expected.role) {
      fail(
        `Profile role mismatch for ${expected.email}: expected "${expected.role}", got "${row.role}".\n` +
          'Check that migration 0002 (0002_allow_service_role_role_updates.sql) has been applied.',
      );
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Env validation.
  if (!SUPABASE_URL) {
    fail('NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local.');
  }
  if (!SERVICE_ROLE_KEY) {
    fail('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local.');
  }

  // Production guard.
  if (looksLikeProduction(SUPABASE_URL) && !ALLOW_PROD) {
    fail(
      `Refusing to seed against what appears to be a production Supabase project:\n` +
        `  URL: ${SUPABASE_URL}\n\n` +
        `The URL does not contain "localhost", "127.0.0.1", or "staging".\n` +
        `If you genuinely intend to run this against production, set:\n` +
        `  SEED_ALLOW_PROD=1\n` +
        `and re-run. Be careful — this will create or overwrite test accounts.`,
    );
  }

  console.log('\nDistrict Pour Haus — seed-users');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log('');

  const supabase = createServiceClient();

  const accounts: AccountSpec[] = [
    {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      fullName: 'DPH Admin',
      role: 'admin',
    },
    {
      email: STAFF_EMAIL,
      password: STAFF_PASSWORD,
      fullName: 'DPH Staff',
      role: 'staff',
    },
  ];

  const provisionedIds = new Map<string, { email: string; role: string }>();

  console.log('Provisioning accounts…');
  for (const spec of accounts) {
    const userId = await upsertUser(supabase, spec);
    provisionedIds.set(userId, { email: spec.email, role: spec.role });
  }

  // Sanity check: confirm profiles rows exist with the right roles.
  await verifyProfiles(supabase, [...provisionedIds.keys()], provisionedIds);

  // Final summary.
  console.log('');
  console.log('Done.');
  console.log('');
  console.log(`  Seeded admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  Seeded staff: ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
  console.log(`  Log in at:    ${SITE_URL}/login`);
  console.log('');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\nUnhandled error: ${message}\n`);
  process.exit(1);
});
