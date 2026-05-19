import { requireStaff } from '@/lib/auth';
import { EventForm } from '@/components/admin/EventForm';
import { createEventAction } from '../actions';

/**
 * New event page. Generates a UUID on the server so the cover image upload
 * can use it to namespace storage paths before the DB row exists.
 */
export default async function NewEventPage() {
  await requireStaff();

  // Generate the pending id server-side (avoids a crypto.randomUUID() call in
  // an RSC where crypto is always available, and provides the same value to
  // both the hidden input and CoverImageUpload).
  const { randomUUID } = await import('crypto');
  const pendingId = randomUUID();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New event</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fill in the details below. You can save as a draft and publish later.
        </p>
      </div>

      <EventForm action={createEventAction} pendingId={pendingId} />
    </div>
  );
}
