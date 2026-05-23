import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Public buckets — objects are world-readable via their public URL. */
type PublicBucket = 'media';

/**
 * Private buckets — objects are not publicly accessible.
 * Access is gated via signed URLs generated server-side with the admin client.
 */
type PrivateBucket = 'applications';

/** All known storage buckets. */
type AnyBucket = PublicBucket | PrivateBucket;

export interface CreateSignedUploadUrlOpts {
  bucket: AnyBucket;
  path: string;
  /** Seconds until the signed URL expires. Defaults to 60. */
  expiresIn?: number;
}

export interface SignedUploadResult {
  signedUrl: string;
  token: string;
  path: string;
}

export interface GetPublicUrlOpts {
  bucket: PublicBucket;
  path: string;
}

export interface DeleteObjectOpts {
  bucket: AnyBucket;
  path: string;
}

export interface CreateSignedDownloadUrlOpts {
  bucket: PrivateBucket;
  path: string;
  /** Seconds until the signed URL expires. Defaults to 60. */
  expiresIn?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a signed upload URL so the browser can PUT directly to Supabase
 * Storage without needing the service-role key on the client.
 *
 * Uses the admin client because storage RLS is already enforced by the
 * server action that calls this helper (via requireStaff).
 */
export async function createSignedUploadUrl(
  opts: CreateSignedUploadUrlOpts,
): Promise<SignedUploadResult> {
  const { bucket, path, expiresIn = 60 } = opts;
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    throw new Error(
      `storage.createSignedUploadUrl failed: ${error?.message ?? 'no data'}`,
    );
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };

  // expiresIn is accepted by the signature for future use but Supabase's
  // createSignedUploadUrl does not expose a TTL option in the JS SDK v2;
  // the default server-side TTL (60 s) applies.
  void expiresIn;
}

/**
 * Create a short-lived signed download URL for an object in a private bucket.
 *
 * Uses the admin client (service-role) so the URL is generated regardless of
 * the caller's auth context — access control is enforced in the server action
 * layer (requireStaff) before this helper is invoked.
 *
 * Default TTL is 60 seconds — enough for the browser to receive the redirect
 * from the admin UI and begin the download.
 */
export async function createSignedDownloadUrl(
  opts: CreateSignedDownloadUrlOpts,
): Promise<string> {
  const { bucket, path, expiresIn = 60 } = opts;
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw new Error(
      `storage.createSignedDownloadUrl failed: ${error?.message ?? 'no data'}`,
    );
  }

  return data.signedUrl;
}

/**
 * Derive the public URL for an object in a public bucket.
 * Does not hit the network — constructs the URL from env vars.
 */
export function getPublicUrl(opts: GetPublicUrlOpts): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
  }
  // Standard Supabase Storage public URL pattern.
  return `${base}/storage/v1/object/public/${opts.bucket}/${opts.path}`;
}

/**
 * Delete a single object from storage.
 * Uses the admin client so it is not subject to storage RLS.
 */
export async function deleteObject(opts: DeleteObjectOpts): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(opts.bucket).remove([opts.path]);
  if (error) {
    throw new Error(`storage.deleteObject failed: ${error.message}`);
  }
}
