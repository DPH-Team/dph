'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { createEventSchema, updateEventSchema } from '@/lib/validators/event';
import {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
} from '@/lib/db/queries/events';
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit';
import { deleteObject } from '@/lib/supabase/storage';
import type { Event } from '@/lib/db/schema';

// ─── State type ───────────────────────────────────────────────────────────────

export type ActionState =
  | { ok: true; event?: Event }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function revalidateEvents() {
  revalidateTag('events', {});
  revalidatePath('/events');
}

// ─── createEventAction ────────────────────────────────────────────────────────

export async function createEventAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  // 1. Auth gate
  const profile = await requireStaff();

  // 2. Parse + validate
  const raw = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt') || null,
    descriptionMd: formData.get('descriptionMd') ?? '',
    coverImagePath: formData.get('coverImagePath') || null,
    coverImageAlt: formData.get('coverImageAlt') ?? '',
    ticketUrl: formData.get('ticketUrl') || null,
    featured: formData.get('featured') === 'true',
    published: formData.get('published') === 'true',
  };

  const result = createEventSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors,
    };
  }

  const data = result.data;

  // 3. Insert
  let event: Event;
  try {
    event = await createEvent({
      title: data.title,
      slug: data.slug,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      descriptionMd: data.descriptionMd,
      coverImagePath: data.coverImagePath ?? null,
      coverImageAlt: data.coverImageAlt,
      ticketUrl: data.ticketUrl ?? null,
      featured: data.featured,
      published: data.published,
      createdBy: profile.id,
      updatedBy: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to create event: ${msg}` };
  }

  // 4. Audit
  await auditCreate('event', event.id, event as unknown as Record<string, unknown>);

  // 5. Revalidate
  revalidateEvents();

  return { ok: true, event };
}

// ─── updateEventAction ────────────────────────────────────────────────────────

export async function updateEventAction(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  // 1. Auth gate
  const profile = await requireStaff();

  // 2. Fetch current row for diff
  const before = await getEventById(id);
  if (!before) {
    return { ok: false, error: 'Event not found.' };
  }

  // 3. Parse + validate
  const raw = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt') || null,
    descriptionMd: formData.get('descriptionMd') ?? '',
    coverImagePath: formData.get('coverImagePath') || null,
    coverImageAlt: formData.get('coverImageAlt') ?? '',
    ticketUrl: formData.get('ticketUrl') || null,
    featured: formData.get('featured') === 'true',
    published: formData.get('published') === 'true',
  };

  const result = updateEventSchema.safeParse(raw);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return {
      ok: false,
      error: 'Please correct the errors below.',
      fieldErrors,
    };
  }

  const data = result.data;

  // 4. Update
  let event: Event;
  try {
    event = await updateEvent(id, {
      title: data.title,
      slug: data.slug,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      descriptionMd: data.descriptionMd,
      coverImagePath: data.coverImagePath ?? null,
      coverImageAlt: data.coverImageAlt,
      ticketUrl: data.ticketUrl ?? null,
      featured: data.featured,
      published: data.published,
      updatedBy: profile.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to update event: ${msg}` };
  }

  // 5. Audit
  await auditUpdate(
    'event',
    id,
    before as unknown as Record<string, unknown>,
    event as unknown as Record<string, unknown>,
  );

  // 6. Revalidate
  revalidateEvents();

  return { ok: true, event };
}

// ─── deleteEventAction ────────────────────────────────────────────────────────

export async function deleteEventAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Auth gate
  await requireStaff();

  // 2. Fetch row for audit + cover cleanup
  const event = await getEventById(id);
  if (!event) {
    return { ok: false, error: 'Event not found.' };
  }

  // 3. Delete cover image from storage if present
  if (event.coverImagePath) {
    try {
      await deleteObject({ bucket: 'media', path: event.coverImagePath });
    } catch (err) {
      // Non-fatal — log and continue so the DB row is still removed
      console.error('[deleteEventAction] Failed to delete cover image:', err);
    }
  }

  // 4. Hard delete
  try {
    await deleteEvent(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Failed to delete event: ${msg}` };
  }

  // 5. Audit
  await auditDelete('event', id, event as unknown as Record<string, unknown>);

  // 6. Revalidate
  revalidateEvents();

  return { ok: true };
}
