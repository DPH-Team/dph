import { requireStaff } from '@/lib/auth';
import { listEvents } from '@/lib/db/queries/events';
import { EventsClientPage } from './EventsClientPage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function EventsListPage() {
  await requireStaff();
  const events = await listEvents({ limit: 200 });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage taproom events, shows, and specials.
          </p>
        </div>
        <Link href="/admin/events/new">
          <Button size="sm">New event</Button>
        </Link>
      </header>

      <EventsClientPage events={events} />
    </div>
  );
}
