import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listSections } from '@/lib/db/queries/menu';
import { db } from '@/lib/db';
import { menuItems } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { ResourceTable } from '@/components/admin/ResourceTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Column } from '@/components/admin/ResourceTable';
import type { MenuSection } from '@/lib/db/schema';
import { VENUE_TZ } from '@/lib/datetime';

function formatUpdatedAt(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

type SectionWithCount = MenuSection & { itemCount: number };

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

export default async function MenuPage() {
  await requireStaff();

  const sections = await listSections({ includeUnavailable: true });

  // Fetch item counts per section and join in memory
  const countRows = await db
    .select({
      sectionId: menuItems.sectionId,
      count: sql<number>`count(*)::int`,
    })
    .from(menuItems)
    .groupBy(menuItems.sectionId);

  const countMap = new Map<string, number>(
    countRows.map((r) => [r.sectionId, r.count]),
  );

  const sectionsWithCounts: SectionWithCount[] = sections.map((s) => ({
    ...s,
    itemCount: countMap.get(s.id) ?? 0,
  }));

  const newSectionButton = (
    <Button size="sm" nativeButton={false} render={<Link href="/admin/menu/sections/new" />}>
      + New section
    </Button>
  );

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Menu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sections and items that show up on the public menu.
          </p>
        </div>
        {newSectionButton}
      </header>

      <ResourceTable
        data={sectionsWithCounts}
        columns={columns}
        rowKey={(s) => s.id}
        rowHref={(s) => `/admin/menu/sections/${s.id}`}
        emptyState={{
          title: 'No sections yet.',
          description: 'Create your first menu section to get started.',
          action: newSectionButton,
        }}
      />
    </div>
  );
}
