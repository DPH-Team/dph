import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Wrench } from 'lucide-react';

// ─── Recent activity mini-list ────────────────────────────────────────────────

async function RecentActivity() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('audit_log')
    .select('id, occurred_at, actor_email, action, entity_type, entity_id')
    .order('occurred_at', { ascending: false })
    .limit(5);

  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No activity recorded yet — check back after your first login or content
        update.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const occurredAt = new Date(row.occurred_at as string);
        const entityDisplay =
          row.entity_type && row.entity_id
            ? `${row.entity_type}/${row.entity_id}`
            : (row.entity_type ?? null);

        return (
          <li key={row.id as number} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {row.action as string}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {(row.actor_email as string) ?? '—'}
                {entityDisplay ? ` · ${entityDisplay}` : ''}
              </p>
            </div>
            <time
              dateTime={occurredAt.toISOString()}
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {occurredAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const profile = await requireStaff();
  const displayName = profile.full_name ?? profile.email.split('@')[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Welcome banner */}
      <div className="flex items-start gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <LayoutDashboard className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back, {displayName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            You&apos;re signed in as{' '}
            <span className="font-medium text-foreground">{profile.email}</span>
            {' '}with the{' '}
            <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'} className="text-xs align-middle">
              {profile.role}
            </Badge>{' '}
            role.
          </p>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Recent activity card */}
        <Card className="col-span-full sm:col-span-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Recent activity
            </h2>
            <a
              href="/admin/activity"
              className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              View all
            </a>
          </div>
          <RecentActivity />
        </Card>

        {/* Phase 4 callout card */}
        <Card className="col-span-full sm:col-span-1 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">
              Content management
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Events, menu, hours, gallery, inquiries, careers, and more are all
            managed from the sidebar. Full editing tools land in{' '}
            <strong className="text-foreground">Phase 4</strong> — sections in
            the nav marked &quot;Coming in Phase 4&quot; will activate as the
            build advances.
          </p>
        </Card>
      </div>
    </div>
  );
}
