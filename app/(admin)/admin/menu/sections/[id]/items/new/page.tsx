import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getSectionById } from '@/lib/db/queries/menu';
import { createMenuItemAction } from '@/app/(admin)/admin/menu/actions';
import { ItemForm } from '@/app/(admin)/admin/menu/sections/[id]/items/ItemForm';
import { BreadcrumbLabel } from '@/components/admin/BreadcrumbLabels';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewMenuItemPage({ params }: PageProps) {
  await requireStaff();

  const { id: sectionId } = await params;

  const section = await getSectionById(sectionId);
  if (!section) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Register UUID → section name so the breadcrumb doesn't show a raw UUID */}
      <BreadcrumbLabel segment={sectionId} label={section.name} />

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
          <span>New item</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">New item</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add a new item to &ldquo;{section.name}&rdquo;.
        </p>
      </header>

      <ItemForm
        mode="create"
        sectionId={sectionId}
        action={createMenuItemAction}
      />
    </div>
  );
}
