import { requireStaff } from '@/lib/auth';
import { createMenuSectionAction } from '@/app/(admin)/admin/menu/actions';
import { SectionForm } from '@/app/(admin)/admin/menu/sections/SectionForm';

export default async function NewMenuSectionPage() {
  await requireStaff();

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          Menu › New section
        </p>
        <h1 className="text-xl font-semibold text-foreground">New section</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create a new section to group menu items.
        </p>
      </header>

      <SectionForm mode="create" action={createMenuSectionAction} />
    </div>
  );
}
