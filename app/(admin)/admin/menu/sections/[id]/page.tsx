import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getSectionById, listItemsBySection } from '@/lib/db/queries/menu';
import {
  updateMenuSectionAction,
  deleteMenuSectionAction,
} from '@/app/(admin)/admin/menu/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SectionForm } from '@/app/(admin)/admin/menu/sections/SectionForm';
import { DeleteSectionButton } from '@/app/(admin)/admin/menu/sections/[id]/DeleteSectionButton';
import { ItemsTable } from '@/app/(admin)/admin/menu/sections/[id]/ItemsTable';
import { BreadcrumbLabel } from '@/components/admin/BreadcrumbLabels';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MenuSectionDetailPage({ params }: PageProps) {
  await requireStaff();

  const { id: sectionId } = await params;

  const [section, items] = await Promise.all([
    getSectionById(sectionId),
    listItemsBySection(sectionId, { includeUnavailable: true }),
  ]);

  if (!section) {
    notFound();
  }

  const boundUpdateAction = updateMenuSectionAction.bind(null, sectionId);
  const boundDeleteAction = deleteMenuSectionAction.bind(null, sectionId);

  const newItemHref = `/admin/menu/sections/${sectionId}/items/new`;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Register UUID → friendly name for the breadcrumb topbar */}
      <BreadcrumbLabel segment={sectionId} label={section.name} />

      {/* Breadcrumb + header */}
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link href="/admin/menu" className="hover:text-foreground transition-colors">
            Menu
          </Link>
          {' › '}
          <span>{section.name}</span>
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {section.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Edit section details and manage its items.
            </p>
          </div>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={newItemHref} />}
          >
            + New item
          </Button>
        </div>
      </header>

      {/* Section A: edit form */}
      <section aria-label="Section details">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Section details
        </h2>
        <SectionForm
          mode="edit"
          section={section}
          action={boundUpdateAction}
        />
      </section>

      {/* Section B: items table */}
      <section aria-label="Items in this section">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Items</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Items in this section. Use the sort number to control order.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={newItemHref} />}
          >
            + New item
          </Button>
        </div>

        <ItemsTable items={items} sectionId={sectionId} />
      </section>

      {/* Section C: danger zone */}
      <section aria-label="Danger zone">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete this section
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All items in this section must be deleted first. This action
                cannot be undone.
              </p>
            </div>
            <DeleteSectionButton
              sectionName={section.name}
              deleteAction={boundDeleteAction}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
