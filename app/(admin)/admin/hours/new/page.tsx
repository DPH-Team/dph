import { requireStaff } from '@/lib/auth';
import { createHoursOverrideAction } from '@/app/(admin)/admin/hours/actions';
import { HoursOverrideForm } from '@/app/(admin)/admin/hours/HoursOverrideForm';

export default async function NewHoursOverridePage() {
  await requireStaff();

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          Hours › New override
        </p>
        <h1 className="text-xl font-semibold text-foreground">New override</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add a date-specific override to flag a closure, early close, or
          holiday hours.
        </p>
      </header>

      <HoursOverrideForm mode="create" action={createHoursOverrideAction} />
    </div>
  );
}
