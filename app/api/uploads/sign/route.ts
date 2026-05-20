import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createSignedUploadUrl } from '@/lib/supabase/storage';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MiB

/** Maps MIME type to canonical extension. */
const MIME_TO_EXT: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/avif': ['avif'],
};

// ─── Validation schema ────────────────────────────────────────────────────────

const signUploadSchema = z.object({
  kind: z.enum(['gallery', 'team']),
  filename: z.string().min(1).max(260),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  size: z.number().int().positive().max(MAX_SIZE_BYTES, 'File must be 8 MiB or less'),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth: verify staff or admin via the cookie-based server client ──────────
  //
  // requireStaff() from lib/auth.ts calls redirect() on unauthenticated users,
  // which throws a Next.js NEXT_REDIRECT error and is not catchable in a Route
  // Handler. We perform the auth check manually here using the same underlying
  // createClient() call that requireStaff() uses, so we can return a proper
  // JSON 401 instead.
  let actorId: string;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Confirm the user has a staff or admin profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (profile.role !== 'admin' && profile.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    actorId = user.id;
  } catch (err) {
    console.error('[uploads/sign] Auth error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  void actorId; // recorded by the subsequent query/action layer; not needed here

  // ── Parse + validate body ───────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = signUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { kind, filename, contentType, size } = parsed.data;

  // ── Validate that the file extension matches the declared MIME type ─────────
  const rawExt = filename.split('.').pop()?.toLowerCase() ?? '';
  const allowedExts = MIME_TO_EXT[contentType] ?? [];
  if (!allowedExts.includes(rawExt)) {
    return NextResponse.json(
      {
        error: `File extension ".${rawExt}" does not match content type "${contentType}". Expected: ${allowedExts.map((e) => `.${e}`).join(', ')}`,
      },
      { status: 400 },
    );
  }

  // ── Generate a storage path using a fresh UUID ──────────────────────────────
  // crypto.randomUUID() is part of the Web Crypto API (available in dom + esnext
  // lib and in Next.js App Router's Node 18+ runtime).
  const ext = rawExt; // already validated against the MIME type
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;

  // ── Create the signed upload URL via the admin storage client ───────────────
  let signedUploadResult;
  try {
    signedUploadResult = await createSignedUploadUrl({
      bucket: 'media',
      path,
    });
  } catch (err) {
    console.error('[uploads/sign] Failed to create signed upload URL:', err);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  void size; // validated above for the 8 MiB ceiling; storage enforces server-side

  return NextResponse.json({
    signedUrl: signedUploadResult.signedUrl,
    token: signedUploadResult.token,
    path: signedUploadResult.path,
  });
}
