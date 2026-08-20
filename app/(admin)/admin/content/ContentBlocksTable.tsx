'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import { Button } from '@/components/ui/button';
import { VENUE_TZ } from '@/lib/datetime';

// ─── Row shape ────────────────────────────────────────────────────────────────
// Lighter than the raw ContentBlock DB row: one row per key in
// CONTENT_BLOCK_KEYS, merged with the DB rows that exist. Keys without a DB
// row yet (never edited) get updatedAt: null.

export type ContentBlockListRow = {
  key: string;
  updatedAt: Date | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  home_hero: 'Home hero',
  home_callouts: 'Home callouts',
  about_body: 'About body',
  careers_body: 'Careers body',
};

function blockLabel(key: string): string {
  return BLOCK_LABELS[key] ?? key;
}

// Two separate formatters joined by a literal "at" — combining date + time
// parts in a single Intl.DateTimeFormat call renders inconsistently across
// ICU versions ("Jun 10, 2026 at 11:09 AM" vs "Jun 10, 2026, 11:09 AM"),
// which causes a React hydration mismatch between server and browser. Keeping
// the two formatters separate makes the output deterministic.
const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: VENUE_TZ,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: VENUE_TZ,
  hour: 'numeric',
  minute: '2-digit',
});

function formatUpdatedAt(d: Date): string {
  return `${dateFmt.format(d)} at ${timeFmt.format(d)}`;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: Column<ContentBlockListRow>[] = [
  {
    key: 'block',
    header: 'Block',
    cell: (row) => (
      <span className="font-medium text-foreground">{blockLabel(row.key)}</span>
    ),
  },
  {
    key: 'updated',
    header: 'Last updated',
    width: 'w-48',
    cell: (row) =>
      row.updatedAt ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatUpdatedAt(row.updatedAt)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground/60 italic">
          Not yet edited
        </span>
      ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ContentBlocksTableProps {
  blocks: ContentBlockListRow[];
}

export function ContentBlocksTable({ blocks }: ContentBlocksTableProps) {
  return (
    <ResourceTable
      data={blocks}
      columns={columns}
      rowKey={(row) => row.key}
      rowHref={(row) => `/admin/content/${row.key}`}
      rowActions={(row) => (
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/admin/content/${row.key}`} />}
        >
          Edit
        </Button>
      )}
      emptyState={{
        title: 'No content blocks found.',
        description:
          'No content block keys are registered. Check CONTENT_BLOCK_KEYS in lib/validators/content-blocks.ts.',
      }}
    />
  );
}
