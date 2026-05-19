import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getSectionById, listItemsBySection } from '@/lib/db/queries/menu';
import {
  updateMenuSectionAction,
  deleteMenuSectionAction,
} from '@/app/(admin)/admin/menu/actions';
import { ResourceTable } from '@/components/admin/ResourceTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SectionForm } from '@/app/(admin)/admin/menu/sections/SectionForm';
import { DeleteSectionButton } from '@/app/(admin)/admin/menu/sections/[id]/DeleteSectionButton';
import { formatCents } from '@/lib/format';
import type { Column } from '@/components/admin/ResourceTable';
import type { MenuItem } from '@/lib/db/schema';
import type { Allergen } from '@/lib/validators/menu';

interface PageProps {
  params: Promise<{ id: string }>;
}

const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  dairy: 'Dairy',
  nuts: 'Nuts',
  shellfish: 'Shellfish',
  egg: 'Egg',
  soy: 'Soy',
};

const MAX_VISIBLE_ALLERGENS = 3;

function AllergensCell({ allergens }: { allergens: string[] }) {
  if (!allergens || allergens.length === 0) {
    return <span className="text-muted-foreground text-xs">None</span>;
  }

  const visible = allergens.slice(0, MAX_VISIBLE_ALLERGENS);
  const overflow = allergens.length - MAX_VISIBLE_ALLERGENS;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((a) => (
        <Badge
          key={a}
          className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground border-border"
          variant="secondary"
        >
          {ALLERGEN_LABELS[a as Allergen] ?? a}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge
          className="text-xs px-1.5 py-0.5"
          variant="secondary"
        >
          +{overflow} more
        </Badge>
      )}
    </div>
  );
}

const itemColumns: Column<MenuItem>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (item) => (
      <div>
        <span className="font-medium text-foreground">{item.name}</span>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
            {item.description.length > 80
              ? item.description.slice(0, 80) + '…'
              : item.description}
          </p>
        )}
      </div>
    ),
  },
  {
    key: 'price',
    header: 'Price',
    align: 'right',
    width: 'w-24',
    cell: (item) => (
      <span className="font-mono text-sm">
        {formatCents(item.priceCents)}
      </span>
    ),
  },
  {
    key: 'allergens',
    header: 'Allergens',
    cell: (item) => <AllergensCell allergens={item.allergens as string[]} />,
  },
  {
    key: 'sortOrder',
    header: 'Sort',
    align: 'right',
    width: 'w-20',
    cell: (item) => (
      <span className="text-muted-foreground">{item.sortOrder}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    width: 'w-28',
    cell: (item) =>
      item.available ? (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-transparent">
          Available
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-muted-foreground">
          Hidden
        </Badge>
      ),
  },
];

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

        <ResourceTable
          data={items}
          columns={itemColumns}
          rowKey={(item) => item.id}
          rowHref={(item) =>
            `/admin/menu/sections/${sectionId}/items/${item.id}`
          }
          emptyState={{
            title: 'No items in this section.',
            description:
              'Add your first item to start building the menu.',
            action: (
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href={newItemHref} />}
              >
                + New item
              </Button>
            ),
          }}
        />
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
