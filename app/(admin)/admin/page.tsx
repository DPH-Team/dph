import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard } from 'lucide-react';
import { adminNav, NAV_ICONS, type NavItem } from '@/components/admin/nav';
import type { AppRole } from '@/lib/auth';

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

// ─── Quick-access section tile ────────────────────────────────────────────────

function SectionTile({ item }: { item: NavItem }) {
  const Icon = NAV_ICONS[item.icon];

  return (
    <Link
      href={item.href}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-[oklch(0.17_0.004_286)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
        <Icon className="size-4 text-primary" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {item.description}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const profile = await requireStaff();
  const displayName = profile.full_name ?? profile.email.split('@')[0];
  const role = profile.role as AppRole;

  // Exclude the Dashboard item itself and respect admin-only gating for staff.
  const manageSections = adminNav.filter(
    (item) =>
      item.href !== '/admin' &&
      (role === 'admin' || !item.adminOnly),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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
            <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs align-middle">
              {role}
            </Badge>{' '}
            role.
          </p>
        </div>
      </div>

      {/* Manage quick-access grid */}
      <section aria-labelledby="manage-heading">
        <h2
          id="manage-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Manage
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {manageSections.map((item) => (
            <SectionTile key={item.href} item={item} />
          ))}
        </div>
      </section>

      {/* Recent activity card */}
      <section aria-labelledby="activity-heading">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="activity-heading"
              className="text-sm font-semibold text-foreground"
            >
              Recent activity
            </h2>
            <Link
              href="/admin/activity"
              className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              View all
            </Link>
          </div>
          <RecentActivity />
        </Card>
      </section>
    </div>
  );
}
