import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listHoursOverrides } from '@/lib/db/queries/hours-overrides';
import { listWeeklyHours } from '@/lib/db/queries/weekly-hours';
import { Button } from '@/components/ui/button';
import { OverridesTable } from './OverridesTable';
import { WeeklySchedule } from './WeeklySchedule';
import { updateWeeklyScheduleAction } from './actions';

export default async function HoursPage() {
  await requireStaff();

  const [weeklyRows, overrides] = await Promise.all([
    listWeeklyHours(),
    listHoursOverrides(),
  ]);

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Page header */}
      <header>
        <h1 className="text-xl font-semibold text-foreground">Hours</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage the venue&apos;s regular weekly schedule and date-specific
          overrides for closures, early closes, and holiday hours.
        </p>
      </header>

      {/* Weekly schedule section */}
      <section aria-labelledby="weekly-schedule-heading">
        <div className="mb-4">
          <h2
            id="weekly-schedule-heading"
            className="text-base font-semibold text-foreground"
          >
            Weekly schedule
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Default open and close times for each day of the week. Changes
            apply to all future weeks until overridden.
          </p>
        </div>
        <WeeklySchedule rows={weeklyRows} action={updateWeeklyScheduleAction} />
      </section>

      {/* Visual separator */}
      <div className="border-t border-border" />

      {/* Date-specific overrides section */}
      <section aria-labelledby="overrides-heading">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2
              id="overrides-heading"
              className="text-base font-semibold text-foreground"
            >
              Date-specific overrides
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Date-keyed overrides that replace the weekly schedule for a
              single day — closures, early closes, holiday hours.
            </p>
          </div>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/hours/new" />}
          >
            + New override
          </Button>
        </div>
        <OverridesTable overrides={overrides} />
      </section>
    </div>
  );
}
