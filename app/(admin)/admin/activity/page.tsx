import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ActivityTable } from '@/components/admin/ActivityTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/db/schema';

const PAGE_SIZE = 50;

interface ActivityPageProps {
  searchParams: Promise<{ page?: string }>;
}

// ─── Pagination helpers ────────────────────────────────────────────────────────

function buildPageUrl(page: number): string {
  return page === 1 ? '/admin/activity' : `/admin/activity?page=${page}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Use the user-session client — RLS enforces staff-read on audit_log.
  // Do NOT use createAdminClient() here.
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('audit_log')
    .select(
      'id, occurred_at, actor_id, actor_email, action, entity_type, entity_id, diff, ip, user_agent, metadata',
    )
    .order('occurred_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Map snake_case Supabase response to camelCase Drizzle types.
  const entries: AuditLogEntry[] = (rows ?? []).map((r) => ({
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

  const hasPrev = page > 1;
  const hasNext = entries.length === PAGE_SIZE;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every action your team takes — logins, edits, deletes — lands here.
          Read-only. No surprises.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load activity log. Check your connection and try again.
        </div>
      )}

      {/* Table */}
      {!error && <ActivityTable entries={entries} />}

      {/* Pagination */}
      {!error && (entries.length > 0 || page > 1) && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            render={hasPrev ? <Link href={buildPageUrl(page - 1)} /> : undefined}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Prev
          </Button>

          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            render={hasNext ? <Link href={buildPageUrl(page + 1)} /> : undefined}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
