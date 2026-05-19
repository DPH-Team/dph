import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { getEventById } from '@/lib/db/queries/events';
import { EventForm } from '@/components/admin/EventForm';
import { updateEventAction } from '../actions';
import { DeleteEventButton } from './DeleteEventButton';

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  await requireStaff();

  const { id } = await params;
  const event = await getEventById(id);

  if (!event) notFound();

  // Bind the id into the update action so useActionState receives the standard
  // (prev, formData) => ActionState signature.
  const boundUpdate = updateEventAction.bind(null, id);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{event.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edit event details. Changes are saved immediately on submit.
        </p>
      </div>

      <EventForm action={boundUpdate} event={event} pendingId={event.id} />

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deleting this event is permanent and cannot be undone. Any associated
            cover image will also be removed from storage.
          </p>
        </div>
        <DeleteEventButton eventId={id} eventTitle={event.title} />
      </div>
    </div>
  );
}
