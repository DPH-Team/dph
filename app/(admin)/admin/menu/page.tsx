import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listSections } from '@/lib/db/queries/menu';
import { db } from '@/lib/db';
import { menuItems } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { SectionsTable, type SectionWithCount } from './SectionsTable';

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

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Menu</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sections and items that show up on the public menu.
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/menu/sections/new" />}
        >
          + New section
        </Button>
      </header>

      <SectionsTable sections={sectionsWithCounts} />
    </div>
  );
}
