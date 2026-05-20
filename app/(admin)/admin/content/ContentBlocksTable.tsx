'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import { Button } from '@/components/ui/button';
import type { ContentBlock } from '@/lib/db/schema';
import { VENUE_TZ } from '@/lib/datetime';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  home_hero: 'Home hero',
  home_callouts: 'Home callouts',
  about_body: 'About body',
};

function blockLabel(key: string): string {
  return BLOCK_LABELS[key] ?? key;
}

function formatUpdatedAt(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

// ─── Column definitions ───────────────────────────────────────────────────────

const columns: Column<ContentBlock>[] = [
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
    cell: (row) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatUpdatedAt(row.updatedAt)}
      </span>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ContentBlocksTableProps {
  blocks: ContentBlock[];
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
          'Content blocks are seeded by migration. If none appear, run the latest migration.',
      }}
    />
  );
}
