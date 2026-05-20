'use client';

import React, { useId, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, X, RefreshCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoverImageInputProps {
  /** Form field name — a hidden input with this name carries the path. */
  name: string;
  /** Current image path (storage-relative). Shows preview if present. */
  defaultPath?: string | null;
  /** Which upload folder to target. */
  kind: 'gallery' | 'team';
  /** Controls preview container aspect ratio. Default: auto. */
  aspect?: 'square' | 'landscape' | 'auto';
  required?: boolean;
}

type UploadState =
  | { status: 'empty' }
  | { status: 'uploading'; progress: number }
  | { status: 'uploaded'; path: string }
  | { status: 'error'; message: string };

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function resolvePublicUrl(path: string): string {
  const base =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
      : '';
  return `${base}/storage/v1/object/public/media/${path}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CoverImageInput({
  name,
  defaultPath,
  kind,
  aspect = 'auto',
  required,
}: CoverImageInputProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<UploadState>(
    defaultPath
      ? { status: 'uploaded', path: defaultPath }
      : { status: 'empty' },
  );

  const currentPath =
    state.status === 'uploaded' ? state.path : (defaultPath ?? '');

  // ── Upload flow ───────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      // Basic client-side validation
      if (!file.type.match(/^image\/(jpeg|png|webp|avif)$/i)) {
        toast.error('Unsupported file type. Use JPEG, PNG, WebP, or AVIF.');
        setState({ status: 'error', message: 'Unsupported file type.' });
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error('File is too large. Maximum size is 8 MB.');
        setState({ status: 'error', message: 'File too large (max 8 MB).' });
        return;
      }

      setState({ status: 'uploading', progress: 0 });

      // Step 1: get signed URL from our route
      let signedUrl: string;
      let path: string;
      try {
        const res = await fetch('/api/uploads/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind,
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        signedUrl = data.signedUrl as string;
        path = data.path as string;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to get upload URL.';
        toast.error(msg);
        setState({ status: 'error', message: msg });
        return;
      }

      // Step 2: PUT directly to Supabase Storage
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setState({
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
          setState({ status: 'uploaded', path });
        },
        (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed.';
          toast.error(msg);
          setState({ status: 'error', message: msg });
        },
      );
    },
    [kind],
  );

  // ── Event handlers ────────────────────────────────────────────────────────

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset so the same file can be reselected
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
    setState({ status: 'empty' });
  };

  const onRetry = () => {
    setState({ status: 'empty' });
    fileInputRef.current?.click();
  };

  // ── Aspect class ──────────────────────────────────────────────────────────

  const aspectClass =
    aspect === 'square'
      ? 'aspect-square'
      : aspect === 'landscape'
        ? 'aspect-video'
        : '';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Hidden input carries the path into FormData */}
      <input type="hidden" name={name} value={currentPath} />

      {/* File input (visually hidden) */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={onInputChange}
        aria-label="Upload image"
      />

      {/* State: empty */}
      {state.status === 'empty' && (
        <div
          role="button"
          tabIndex={0}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-labelledby={`${inputId}-label`}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border cursor-pointer',
            'bg-card/50 text-muted-foreground transition-colors',
            'hover:border-primary/50 hover:bg-primary/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            aspectClass || 'min-h-32',
            'px-4 py-8',
          )}
        >
          <Upload className="size-6" aria-hidden="true" />
          <p id={`${inputId}-label`} className="text-xs text-center">
            Click or drop image
            <br />
            <span className="text-[11px] text-muted-foreground/70">
              JPEG / PNG / WebP / AVIF, max 8 MB
            </span>
          </p>
          {required && (
            <span className="sr-only">Required</span>
          )}
        </div>
      )}

      {/* State: uploading */}
      {state.status === 'uploading' && (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card/50',
            aspectClass || 'min-h-32',
            'px-4 py-8',
          )}
          aria-live="polite"
          aria-label={`Uploading: ${state.progress}%`}
        >
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          <div className="w-full max-w-48 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span>{state.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* State: uploaded */}
      {state.status === 'uploaded' && (
        <div className={cn('relative rounded-lg overflow-hidden border border-border group', aspectClass)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvePublicUrl(state.path)}
            alt="Preview"
            className={cn(
              'object-cover w-full',
              aspectClass ? 'h-full' : 'max-h-64',
            )}
          />
          {/* Overlay actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex items-center gap-1.5 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-900',
                'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              aria-label="Replace image"
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
              aria-label="Remove image"
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      )}

      {/* State: error */}
      {state.status === 'error' && (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-destructive/50 bg-destructive/5',
            aspectClass || 'min-h-32',
            'px-4 py-8',
          )}
          role="alert"
        >
          <p className="text-xs text-destructive text-center">{state.message}</p>
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <RefreshCcw className="size-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
