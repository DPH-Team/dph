import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getHoursOverrideById } from '@/lib/db/queries/hours-overrides';
import {
  updateHoursOverrideAction,
  deleteHoursOverrideAction,
} from '@/app/(admin)/admin/hours/actions';
import { Card, CardContent } from '@/components/ui/card';
import { HoursOverrideForm } from '@/app/(admin)/admin/hours/HoursOverrideForm';
import { DeleteOverrideButton } from '@/app/(admin)/admin/hours/[id]/DeleteOverrideButton';
import { VENUE_TZ } from '@/lib/datetime';

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatOverrideDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HoursOverrideDetailPage({ params }: PageProps) {
  await requireStaff();

  const { id } = await params;

  const override = await getHoursOverrideById(id);
  if (!override) {
    notFound();
  }

  const formattedDate = formatOverrideDate(override.date);

  const boundUpdateAction = updateHoursOverrideAction.bind(null, id);
  const boundDeleteAction = deleteHoursOverrideAction.bind(null, id);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Breadcrumb + header */}
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link
            href="/admin/hours"
            className="hover:text-foreground transition-colors"
          >
            Hours
          </Link>
          {' › '}
          <span>{formattedDate}</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">Edit override</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
      </header>

      {/* Edit form */}
      <section aria-label="Override details">
        <HoursOverrideForm
          mode="edit"
          override={override}
          action={boundUpdateAction}
        />
      </section>

      {/* Danger zone */}
      <section aria-label="Danger zone">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete this override
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes the override for this date. The regular weekly schedule
                will apply instead. This action cannot be undone.
              </p>
            </div>
            <DeleteOverrideButton
              overrideDate={formattedDate}
              deleteAction={boundDeleteAction}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
