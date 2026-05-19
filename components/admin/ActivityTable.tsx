import { ScrollText } from 'lucide-react';
import { ActivityRow } from './ActivityRow';
import type { AuditLogEntry } from '@/lib/db/schema';

interface ActivityTableProps {
  entries: AuditLogEntry[];
}

export function ActivityTable({ entries }: ActivityTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
          <ScrollText className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Nothing to show yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          No activity recorded yet. Once your team starts working — logging in,
          saving events, or updating hours — every action shows up right here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Horizontal scroll wrapper for narrow screens */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] caption-bottom text-sm">
          <thead>
            <tr className="border-b border-border bg-[oklch(0.175_0.002_286)]">
              <th
                scope="col"
                className="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                When
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Actor
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Action
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Entity
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                IP
              </th>
              <th
                scope="col"
                className="py-3 pl-3 pr-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
