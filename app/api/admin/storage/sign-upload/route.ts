import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import {
  createSignedUploadUrl,
  eventCoverPath,
} from '@/lib/supabase/storage';

type RequestBody = {
  kind: 'event-cover';
  eventId: string;
  ext: string;
};

/**
 * POST /api/admin/storage/sign-upload
 *
 * Returns a signed upload URL so the browser can PUT directly to Supabase
 * Storage without the service-role key leaking to the client.
 *
 * Body: { kind: 'event-cover'; eventId: string; ext: string }
 * Response: { signedUrl: string; token: string; path: string }
 */
export async function POST(req: NextRequest) {
  // Require authenticated staff/admin
  try {
    await requireStaff();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { kind, eventId, ext } = body;

  if (kind !== 'event-cover') {
    return NextResponse.json({ error: 'Unsupported kind' }, { status: 400 });
  }

  if (!eventId || typeof eventId !== 'string') {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
  }

  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  const cleanExt = (ext ?? '').toLowerCase().replace(/^\./, '');
  if (!allowedExts.includes(cleanExt)) {
    return NextResponse.json(
      { error: `Extension not allowed: ${cleanExt}` },
      { status: 400 },
    );
  }

  const path = eventCoverPath(eventId, cleanExt);

  try {
    const result = await createSignedUploadUrl({ bucket: 'media', path });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[sign-upload] Failed to create signed URL:', err);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 },
    );
  }
}
