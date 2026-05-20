'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MenuSection } from '@/lib/db/schema';
import { VENUE_TZ } from '@/lib/datetime';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SectionWithCount = MenuSection & { itemCount: number };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatUpdatedAt(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

// ─── Column definitions ────────────────────────────────────────────────────────

const columns: Column<SectionWithCount>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (s) => (
      <div>
        <span className="font-medium text-foreground">{s.name}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{s.slug}</p>
      </div>
    ),
  },
  {
    key: 'items',
    header: 'Items',
    align: 'right',
    width: 'w-24',
    cell: (s) => (
      <span className="text-muted-foreground tabular-nums">{s.itemCount}</span>
    ),
  },
  {
    key: 'sortOrder',
    header: 'Sort',
    align: 'right',
    width: 'w-20',
    cell: (s) => (
      <span className="text-muted-foreground tabular-nums">{s.sortOrder}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-28',
    cell: (s) =>
      s.available ? (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-transparent">
          Available
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-muted-foreground">
          Hidden
        </Badge>
      ),
  },
  {
    key: 'updated',
    header: 'Updated',
    width: 'w-36',
    cell: (s) => (
      <span className="text-xs text-muted-foreground">
        {formatUpdatedAt(s.updatedAt)}
      </span>
    ),
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

interface SectionsTableProps {
  sections: SectionWithCount[];
}

export function SectionsTable({ sections }: SectionsTableProps) {
  const newSectionButton = (
    <Button
      size="sm"
      nativeButton={false}
      render={<Link href="/admin/menu/sections/new" />}
    >
      + New section
    </Button>
  );

  return (
    <ResourceTable
      data={sections}
      columns={columns}
      rowKey={(s) => s.id}
      rowHref={(s) => '/admin/menu/sections/' + s.id}
      emptyState={{
        title: 'No sections yet.',
        description: 'Create your first menu section to get started.',
        action: newSectionButton,
      }}
    />
  );
}
