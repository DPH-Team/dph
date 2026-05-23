import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { AuditLogEntry } from '@/lib/db/schema';
import type { ListAuditFilterInput } from '@/lib/validators/audit-log';

// ─── Constants ────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 50;

// ─── Distinct-value helpers ───────────────────────────────────────────────────

/**
 * Return distinct `action` values from audit_log, sorted alphabetically.
 *
 * Strategy: fetch up to 1000 rows selecting only the `action` column, then
 * de-duplicate in JS. Avoids needing a SQL function or a DISTINCT query that
 * Supabase JS doesn't expose directly. Cap at 100 unique values before
 * falling back to a text input — see ActivityPage for the fallback.
 */
export async function getDistinctActions(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_log')
    .select('action')
    .order('action', { ascending: true })
    .limit(1000);

  if (!data) return [];

  const seen = new Set<string>();
  for (const row of data) {
    if (row.action) seen.add(row.action as string);
  }
  return Array.from(seen).sort();
}

/**
 * Return distinct `entity_type` values from audit_log, sorted alphabetically.
 * Same de-duplication strategy as getDistinctActions().
 */
export async function getDistinctEntityTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_log')
    .select('entity_type')
    .order('entity_type', { ascending: true })
    .limit(1000);

  if (!data) return [];

  const seen = new Set<string>();
  for (const row of data) {
    if (row.entity_type) seen.add(row.entity_type as string);
  }
  return Array.from(seen).sort();
}

// ─── Filtered list + count ────────────────────────────────────────────────────

export interface AuditLogPage {
  entries: AuditLogEntry[];
  /** Total rows matching the current filters (used for pagination display). */
  total: number;
}

/**
 * Return a paginated, filtered slice of audit_log rows.
 *
 * Dates are treated as UTC midnight — simpler and consistent regardless of
 * server timezone. The `to` date is made inclusive by advancing to next-day
 * midnight (occurred_at < to+1).
 *
 * Uses the user-session Supabase client; RLS enforces staff-read.
 * Do NOT switch to createAdminClient() — the RLS policy is the security boundary.
 */
export async function listAuditLog(
  filter: ListAuditFilterInput = {},
  page = 1,
): Promise<AuditLogPage> {
  const supabase = await createClient();
  const offset = (page - 1) * PAGE_SIZE;

  // Build query with filters — Supabase JS chains are immutable so we
  // accumulate a base query and apply optional filters sequentially.
  let query = supabase
    .from('audit_log')
    .select(
      'id, occurred_at, actor_id, actor_email, action, entity_type, entity_id, diff, ip, user_agent, metadata',
      { count: 'exact' },
    )
    .order('occurred_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filter.actor) {
    // Case-insensitive substring match against actor_email.
    query = query.ilike('actor_email', `%${filter.actor}%`);
  }

  if (filter.action) {
    query = query.eq('action', filter.action);
  }

  if (filter.entityType) {
    query = query.eq('entity_type', filter.entityType);
  }

  if (filter.from) {
    // occurred_at >= YYYY-MM-DD 00:00:00 UTC
    query = query.gte('occurred_at', `${filter.from}T00:00:00.000Z`);
  }

  if (filter.to) {
    // occurred_at < (to + 1 day) 00:00:00 UTC — makes the to-date inclusive.
    const toDate = new Date(`${filter.to}T00:00:00.000Z`);
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    query = query.lt('occurred_at', toDate.toISOString());
  }

  const { data: rows, count, error } = await query;

  if (error) {
    return { entries: [], total: 0 };
  }

  // `r` is typed as `any` by the Supabase JS client when using a raw string
  // select — cast explicitly here rather than adding a Supabase-generated type.
  const entries: AuditLogEntry[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as number,
    occurredAt: new Date(r.occurred_at as string),
    actorId: (r.actor_id as string) ?? null,
    actorEmail: (r.actor_email as string) ?? null,
    action: r.action as string,
    entityType: (r.entity_type as string) ?? null,
    entityId: (r.entity_id as string) ?? null,
    diff: r.diff ?? null,
    ip: (r.ip as string) ?? null,
    userAgent: (r.user_agent as string) ?? null,
    metadata: r.metadata ?? null,
  }));

  return { entries, total: count ?? 0 };
}
