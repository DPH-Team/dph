import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSignedUploadUrl } from '@/lib/supabase/storage';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { headers } from 'next/headers';

// ─── Constants ────────────────────────────────────────────────────────────────

type AllowedContentType =
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ALLOWED_CONTENT_TYPES: [AllowedContentType, ...AllowedContentType[]] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

/** Maps MIME type to canonical extension(s). */
const MIME_TO_EXT: Record<AllowedContentType, string[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    'docx',
  ],
};

// ─── Validation schema ────────────────────────────────────────────────────────

const signResumeSchema = z.object({
  filename: z.string().min(1).max(260),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_SIZE_BYTES, 'File must be 5 MiB or less'),
  /** Cloudflare Turnstile challenge token. */
  'cf-turnstile-response': z.string().min(1),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Parse + validate body ───────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = signResumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { filename, contentType, size, 'cf-turnstile-response': turnstileToken } =
    parsed.data;

  // ── Turnstile verification ──────────────────────────────────────────────────
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    undefined;

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json(
      { error: 'Bot verification failed. Please try again.' },
      { status: 403 },
    );
  }

  // ── Validate file extension matches declared MIME type ─────────────────────
  const rawExt = filename.split('.').pop()?.toLowerCase() ?? '';
  const allowedExts = MIME_TO_EXT[contentType as AllowedContentType] ?? [];
  if (!allowedExts.includes(rawExt)) {
    return NextResponse.json(
      {
        error: `File extension ".${rawExt}" does not match content type "${contentType}". Expected: ${allowedExts.map((e) => `.${e}`).join(', ')}`,
      },
      { status: 400 },
    );
  }

  // ── Generate a storage path: resumes/{uuid}.{ext} ──────────────────────────
  const path = `resumes/${crypto.randomUUID()}.${rawExt}`;

  // ── Create the signed upload URL in the private applications bucket ─────────
  let signedUploadResult;
  try {
    signedUploadResult = await createSignedUploadUrl({
      bucket: 'applications',
      path,
    });
  } catch (err) {
    console.error('[uploads/sign-resume] Failed to create signed upload URL:', err);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 },
    );
  }

  void size; // validated above for the 5 MiB ceiling; storage enforces server-side

  return NextResponse.json({
    signedUrl: signedUploadResult.signedUrl,
    token: signedUploadResult.token,
    path: signedUploadResult.path,
  });
}
