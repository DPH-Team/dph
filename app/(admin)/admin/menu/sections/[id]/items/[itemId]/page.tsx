import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getSectionById, getItemById } from '@/lib/db/queries/menu';
import {
  updateMenuItemAction,
  deleteMenuItemAction,
} from '@/app/(admin)/admin/menu/actions';
import { Card, CardContent } from '@/components/ui/card';
import { ItemForm } from '@/app/(admin)/admin/menu/sections/[id]/items/ItemForm';
import { DeleteItemButton } from '@/app/(admin)/admin/menu/sections/[id]/items/[itemId]/DeleteItemButton';

interface PageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function MenuItemDetailPage({ params }: PageProps) {
  await requireStaff();

  const { id: sectionId, itemId } = await params;

  const [section, item] = await Promise.all([
    getSectionById(sectionId),
    getItemById(itemId),
  ]);

  if (!section) {
    notFound();
  }
  if (!item || item.sectionId !== sectionId) {
    notFound();
  }

  const boundUpdateAction = updateMenuItemAction.bind(null, itemId);
  const boundDeleteAction = deleteMenuItemAction.bind(null, itemId);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Breadcrumb + header */}
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link href="/admin/menu" className="hover:text-foreground transition-colors">
            Menu
          </Link>
          {' › '}
          <Link
            href={`/admin/menu/sections/${sectionId}`}
            className="hover:text-foreground transition-colors"
          >
            {section.name}
          </Link>
          {' › '}
          <span>{item.name}</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">{item.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edit item details, pricing, and availability.
        </p>
      </header>

      {/* Edit form */}
      <section aria-label="Item details">
        <ItemForm
          mode="edit"
          sectionId={sectionId}
          item={item}
          action={boundUpdateAction}
        />
      </section>

      {/* Danger zone */}
      <section aria-label="Danger zone">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete this item
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This will permanently remove the item from the menu. This action
                cannot be undone.
              </p>
            </div>
            <DeleteItemButton
              itemName={item.name}
              deleteAction={boundDeleteAction}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
