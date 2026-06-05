'use client';

import React, { useId, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, X, RefreshCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaUploadValue {
  path: string | null;
  type: 'image' | 'video' | null;
}

export interface MediaUploadInputProps {
  /** Current storage-relative path (e.g. "hero/uuid.mp4") or null. */
  valuePath: string | null;
  /** The media type of the current value. */
  valueType: 'image' | 'video' | null;
  /** Called whenever the uploaded media changes. */
  onChange: (next: MediaUploadValue) => void;
  /** Controls preview container aspect ratio. Default: 'landscape'. */
  aspect?: 'square' | 'landscape' | 'auto';
  /** Optional aria label for accessibility. */
  label?: string;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'error'; message: string };

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;  // 8 MiB
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MiB

function resolvePublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/media/${path}`;
}

function detectMediaType(mimeType: string): 'image' | 'video' | null {
  if (IMAGE_TYPES.has(mimeType)) return 'image';
  if (VIDEO_TYPES.has(mimeType)) return 'video';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaUploadInput({
  valuePath,
  valueType,
  onChange,
  aspect = 'landscape',
  label = 'Upload media',
}: MediaUploadInputProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });

  const hasMedia = valuePath !== null;

  // ── Upload flow ─────────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      // Client-side type validation
      if (!IMAGE_TYPES.has(file.type) && !VIDEO_TYPES.has(file.type)) {
        toast.error(
          'Unsupported file type. Use JPEG, PNG, WebP, AVIF, MP4, or WebM.',
        );
        setUploadState({
          status: 'error',
          message: 'Unsupported file type.',
        });
        return;
      }

      // Client-side size validation
      const isVideo = VIDEO_TYPES.has(file.type);
      const maxBytes = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
      if (file.size > maxBytes) {
        const capMiB = maxBytes / (1024 * 1024);
        toast.error(`File is too large. Maximum size is ${capMiB} MB.`);
        setUploadState({
          status: 'error',
          message: `File too large (max ${capMiB} MB).`,
        });
        return;
      }

      setUploadState({ status: 'uploading', progress: 0 });

      // Step 1: get signed URL
      let signedUrl: string;
      let path: string;
      try {
        const res = await fetch('/api/uploads/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'hero',
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json() as { signedUrl: string; path: string };
        signedUrl = data.signedUrl;
        path = data.path;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to get upload URL.';
        toast.error(msg);
        setUploadState({ status: 'error', message: msg });
        return;
      }

      // Step 2: PUT directly to Supabase Storage via XHR for progress tracking
      const mediaType = detectMediaType(file.type);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadState({
              status: 'uploading',
              progress: Math.round((e.loaded / e.total) * 100),
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));

        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(file);
      }).then(
        () => {
          setUploadState({ status: 'idle' });
          onChange({ path, type: mediaType });
        },
        (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed.';
          toast.error(msg);
          setUploadState({ status: 'error', message: msg });
        },
      );
    },
    [onChange],
  );

  // ── Event handlers ──────────────────────────────────────────────────────────

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onRemove = () => {
    onChange({ path: null, type: null });
    setUploadState({ status: 'idle' });
  };

  const onRetry = () => {
    setUploadState({ status: 'idle' });
    fileInputRef.current?.click();
  };

  const openFilePicker = () => fileInputRef.current?.click();

  // ── Aspect class ────────────────────────────────────────────────────────────

  const aspectClass =
    aspect === 'square'
      ? 'aspect-square'
      : aspect === 'landscape'
        ? 'aspect-video'
        : '';

  // ── Public preview URL ──────────────────────────────────────────────────────

  const previewUrl = valuePath ? resolvePublicUrl(valuePath) : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Visually hidden file input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={onInputChange}
        aria-label={label}
      />

      {/* Uploading state */}
      {uploadState.status === 'uploading' && (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card/50',
            aspectClass || 'min-h-32',
            'px-4 py-8',
          )}
          aria-live="polite"
          aria-label={`Uploading: ${uploadState.progress}%`}
        >
          <Loader2
            className="size-5 animate-spin text-primary"
            aria-hidden="true"
          />
          <div className="w-full max-w-48 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span>{uploadState.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${uploadState.progress}%` }}
                role="progressbar"
                aria-valuenow={uploadState.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      )}

      {/* Uploaded preview state */}
      {uploadState.status !== 'uploading' && hasMedia && previewUrl && (
        <div
          className={cn(
            'relative rounded-lg overflow-hidden border border-border group',
            aspectClass,
          )}
        >
          {valueType === 'video' ? (
            <video
              src={previewUrl}
              muted
              loop
              playsInline
              autoPlay
              className={cn(
                'object-cover w-full',
                aspectClass ? 'h-full' : 'max-h-64',
              )}
              aria-label="Video preview"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Media preview"
              className={cn(
                'object-cover w-full',
                aspectClass ? 'h-full' : 'max-h-64',
              )}
            />
          )}

          {/* Overlay actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={openFilePicker}
              className={cn(
                'flex items-center gap-1.5 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-900',
                'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="Replace media"
            >
              <RefreshCcw className="size-3.5" aria-hidden="true" />
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className={cn(
                'flex items-center gap-1.5 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-900',
                'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="Remove media"
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Empty / error drop zone */}
      {uploadState.status !== 'uploading' && !hasMedia && (
        <div
          role="button"
          tabIndex={0}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFilePicker();
            }
          }}
          aria-labelledby={`${inputId}-label`}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer',
            'bg-card/50 text-muted-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            uploadState.status === 'error'
              ? 'border-destructive/50 bg-destructive/5 hover:border-destructive/70'
              : 'border-border hover:border-primary/50 hover:bg-primary/5',
            aspectClass || 'min-h-32',
            'px-4 py-8',
          )}
        >
          <Upload className="size-6" aria-hidden="true" />
          <p
            id={`${inputId}-label`}
            className="text-xs text-center"
          >
            {uploadState.status === 'error' ? (
              <span className="text-destructive">{uploadState.message}</span>
            ) : (
              <>
                Click or drop image / video
                <br />
                <span className="text-[11px] text-muted-foreground/70">
                  JPEG · PNG · WebP · AVIF · MP4 · WebM
                </span>
              </>
            )}
          </p>
          {uploadState.status === 'error' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground',
                'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <RefreshCcw className="size-3.5" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Sizing guidance */}
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        <span className="font-medium text-muted-foreground/80">Image:</span>{' '}
        2400&times;1600 (3:2 landscape), JPEG/PNG/WebP, &le;8&thinsp;MB.{' '}
        <span className="font-medium text-muted-foreground/80">Video:</span>{' '}
        MP4 (H.264) 1920&times;1080 (16:9), short silent loop (~10&thinsp;s),
        &le;50&thinsp;MB.
      </p>
    </div>
  );
}
