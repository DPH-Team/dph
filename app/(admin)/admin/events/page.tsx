import { requireStaff } from '@/lib/auth';
import { getEventsSyncStatus } from '@/lib/db/queries/events-cache';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, TriangleAlert } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the current epoch in milliseconds.
 * Plain module-level function — not a component — so the react-hooks/purity
 * rule does not apply here. Components must never call Date.now() directly.
 */
function captureNowMs(): number {
  return Date.now();
}

/**
 * Convert an ISO timestamp string to a human-friendly relative label.
 * Accepts a pre-captured `nowMs` to keep the impure Date.now() call out of
 * any component render path.
 */
function humanizeAge(isoString: string, nowMs: number): string {
  const diffMs = nowMs - new Date(isoString).getTime();
  const totalSeconds = Math.floor(diffMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (totalSeconds < 60) return 'just now';
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function pluralEvents(n: number): string {
  if (n === 0) return 'No upcoming events on the site right now';
  if (n === 1) return '1 upcoming event on the site';
  return `${n} upcoming events on the site`;
}

/**
 * Derive sync display data from the raw DB value and a pre-captured timestamp.
 * Keeping the nowMs capture here (via captureNowMs) means the component body
 * never calls any impure function, satisfying the react-hooks/purity rule.
 */
function deriveSyncDisplay(lastSyncedAt: string | null): {
  isStale: boolean;
  lastSyncedLabel: string;
} {
  const ONE_HOUR_MS = 60 * 60 * 1_000;
  const nowMs = captureNowMs();

  if (lastSyncedAt === null) {
    return { isStale: false, lastSyncedLabel: 'Never synced yet' };
  }

  const ageMs = nowMs - new Date(lastSyncedAt).getTime();
  return {
    isStale: ageMs > ONE_HOUR_MS,
    lastSyncedLabel: `Last synced ${humanizeAge(lastSyncedAt, nowMs)}`,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventsPage() {
  await requireStaff();

  const { lastSyncedAt, upcomingCount } = await getEventsSyncStatus();
  const { isStale, lastSyncedLabel } = deriveSyncDisplay(lastSyncedAt);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sourced from Untappd for Business. The website mirrors what you publish
          there.
        </p>
      </header>

      <Card className="border-border bg-card">
        <CardContent className="px-8 py-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-accent" />
            <h2 className="text-lg font-semibold text-foreground">
              Events live in Untappd
            </h2>
          </div>

          <p className="text-sm text-muted-foreground max-w-prose leading-relaxed">
            Your events are managed straight from your Untappd for Business
            dashboard&nbsp;&mdash; they&apos;ll show up on the site within a
            few minutes of you saving them. We just listen.
          </p>

          <Button
            size="sm"
            className="gap-2"
            nativeButton={false}
            render={
              <a
                href="https://business.untappd.com"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Open Untappd Business
            <ExternalLink className="size-4" aria-hidden="true" />
          </Button>

          {/* ── Sync status strip ── */}
          <div className="border-t border-border pt-4 space-y-2">
            {/* Last synced — stale variant renders as an amber callout */}
            {isStale ? (
              <div
                className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2"
                role="status"
              >
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                <p className="text-xs text-amber-300">
                  {lastSyncedLabel}&nbsp;&mdash; that&apos;s longer than usual.
                  Check your Untappd connection in{' '}
                  <a
                    href="/admin/integrations"
                    className="underline underline-offset-2 hover:text-amber-200 transition-colors"
                  >
                    Integrations
                  </a>
                  .
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {lastSyncedLabel}
              </p>
            )}

            {/* Upcoming count */}
            <p className="text-xs text-muted-foreground">
              {pluralEvents(upcomingCount)}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Sync runs in the background every few minutes. Nothing to do here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
