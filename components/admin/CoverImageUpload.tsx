'use client';

import React, { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageIcon, Loader2, X, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

type AllowedMime = (typeof ALLOWED_MIMES)[number];

function isAllowedMime(mime: string): mime is AllowedMime {
  return ALLOWED_MIMES.includes(mime as AllowedMime);
}

function extFromMime(mime: AllowedMime): string {
  const map: Record<AllowedMime, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  return map[mime];
}

function getPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  return `${base}/storage/v1/object/public/media/${path}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoverImageUploadProps {
  /** The eventId used to namespace the storage path. */
  eventId: string;
  /** Current cover image path (from DB). Controlled by parent. */
  currentPath?: string | null;
  /** Called when upload completes or image is cleared. */
  onChange: (path: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CoverImageUpload({
  eventId,
  currentPath,
  onChange,
}: CoverImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentPath ? getPublicUrl(currentPath) : null,
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (!isAllowedMime(file.type)) {
        setError('Only JPEG, PNG, WebP, and AVIF images are accepted.');
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError('File must be 5 MB or smaller.');
        return;
      }

      const ext = extFromMime(file.type as AllowedMime);

      setUploading(true);

      try {
        // 1. Request a signed upload URL from our API route
        const res = await fetch('/api/admin/storage/sign-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'event-cover', eventId, ext }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Server error: ${res.status}`);
        }

        const { token, path } = (await res.json()) as {
          signedUrl: string;
          token: string;
          path: string;
        };

        // 2. Upload directly to Supabase Storage from the browser
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from('media')
          .uploadToSignedUrl(path, token, file, {
            contentType: file.type,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // 3. Build a local preview URL and notify parent
        const publicUrl = getPublicUrl(path);
        setPreviewUrl(publicUrl);
        onChange(path);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Upload failed. Please try again.',
        );
      } finally {
        setUploading(false);
      }
    },
    [eventId, onChange],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected after clearing
      e.target.value = '';
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleClear = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    onChange(null);
  }, [onChange]);

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className="space-y-2">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIMES.join(',')}
        onChange={handleChange}
        className="sr-only"
        aria-hidden="true"
      />

      {previewUrl ? (
        /* ── Preview ──────────────────────────────────────────────────── */
        <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-border bg-[oklch(0.140_0.002_286)]">
          <Image
            src={previewUrl}
            alt="Cover image preview"
            width={480}
            height={270}
            className="w-full object-cover aspect-video"
            unoptimized
          />
          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'absolute top-2 right-2 flex size-7 items-center justify-center rounded-full',
              'bg-background/80 backdrop-blur-sm border border-border text-foreground',
              'hover:bg-background transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label="Remove cover image"
          >
            <X className="size-3.5" />
          </button>
          {/* Replace button */}
          <button
            type="button"
            onClick={openPicker}
            disabled={uploading}
            className={cn(
              'absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
              'bg-background/80 backdrop-blur-sm border border-border text-foreground',
              'hover:bg-background transition-colors disabled:pointer-events-none disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            {uploading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Upload className="size-3" />
            )}
            Replace
          </button>
        </div>
      ) : (
        /* ── Drop zone ─────────────────────────────────────────────────── */
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed',
            'border-border bg-[oklch(0.140_0.002_286)] px-6 py-10 text-center cursor-pointer',
            'transition-colors hover:border-ring hover:bg-[oklch(0.175_0.002_286)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {uploading ? (
            <Loader2 className="size-8 text-muted-foreground animate-spin mb-3" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground mb-3" />
          )}
          <p className="text-sm font-medium text-foreground">
            {uploading ? 'Uploading…' : 'Click or drag to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPEG, PNG, WebP, AVIF — max 5 MB
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
