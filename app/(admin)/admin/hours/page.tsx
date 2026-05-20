import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listHoursOverrides } from '@/lib/db/queries/hours-overrides';
import { Button } from '@/components/ui/button';
import { OverridesTable } from './OverridesTable';

export default async function HoursPage() {
  await requireStaff();

  const overrides = await listHoursOverrides();

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Hours</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Date-keyed overrides that replace the weekly schedule for a single
            day — closures, early closes, holiday hours.
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/hours/new" />}
        >
          + New override
        </Button>
      </header>

      <OverridesTable overrides={overrides} />
    </div>
  );
}
