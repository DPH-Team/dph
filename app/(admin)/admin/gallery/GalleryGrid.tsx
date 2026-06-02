'use client';

import React, { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Pencil, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  deleteGalleryImageAction,
  reorderGalleryImagesAction,
} from './actions';
import type { GalleryImage } from '@/lib/db/schema';
import type { SortableListProps } from '@/components/admin/SortableList';

const SortableList = dynamic<SortableListProps>(
  () => import('@/components/admin/SortableList').then((m) => m.SortableList),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-busy="true" aria-label="Loading sortable grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-video rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    ),
  },
);

// ─── Public URL helper ────────────────────────────────────────────────────────

function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/media/${path}`;
}

// ─── Confirm dialog state ─────────────────────────────────────────────────────

interface DeleteDialogState {
  open: boolean;
  id: string;
  alt: string;
}

// ─── Single tile ──────────────────────────────────────────────────────────────

interface TileProps {
  image: GalleryImage;
  onDeleteRequest: (id: string, alt: string) => void;
}

function GalleryTile({ image, onDeleteRequest }: TileProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicUrl(image.imagePath)}
          alt={image.alt}
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>

      {/* Info + actions */}
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <p className="text-xs text-foreground leading-snug line-clamp-2">
          {image.alt}
        </p>

        {/* Tag chips */}
        {image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {image.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-auto pt-1">
          <Link
            href={`/admin/gallery/${image.id}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground',
              'hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label={`Edit image: ${image.alt}`}
          >
            <Pencil className="size-3" aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(image.id, image.alt)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-background px-2 py-1 text-xs font-medium text-destructive',
              'hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-label={`Delete image: ${image.alt}`}
          >
            <Trash2 className="size-3" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GalleryGrid ──────────────────────────────────────────────────────────────

interface GalleryGridProps {
  initialImages: GalleryImage[];
}

export function GalleryGrid({ initialImages }: GalleryGridProps) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [orderedIds, setOrderedIds] = useState<string[]>(
    initialImages.map((i) => i.id),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    id: '',
    alt: '',
  });
  const [isPendingSave, startSaveTx] = useTransition();
  const [isPendingDelete, startDeleteTx] = useTransition();

  // ── Reorder ───────────────────────────────────────────────────────────────

  const handleReorder = (newIds: string[]) => {
    setOrderedIds(newIds);
    // Reorder the images array to match
    const idxMap = new Map(newIds.map((id, i) => [id, i]));
    setImages((prev) =>
      [...prev].sort((a, b) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0)),
    );
    setIsDirty(true);
  };

  const handleSaveOrder = () => {
    startSaveTx(async () => {
      const result = await reorderGalleryImagesAction(orderedIds);
      if (result.ok) {
        toast.success('Order saved.');
        setIsDirty(false);
      } else {
        toast.error(result.error ?? 'Failed to save order.');
      }
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const openDeleteDialog = (id: string, alt: string) => {
    setDeleteDialog({ open: true, id, alt });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, id: '', alt: '' });
  };

  const confirmDelete = () => {
    const { id } = deleteDialog;
    closeDeleteDialog();

    startDeleteTx(async () => {
      const result = await deleteGalleryImageAction(id);
      if (result.ok) {
        toast.success('Image deleted.');
        setImages((prev) => prev.filter((img) => img.id !== id));
        setOrderedIds((prev) => prev.filter((oid) => oid !== id));
      } else {
        toast.error(result.error ?? 'Failed to delete image.');
      }
    });
  };

  // ── Sortable items ────────────────────────────────────────────────────────

  const sortableItems = images.map((image) => ({
    id: image.id,
    node: (
      <GalleryTile
        image={image}
        onDeleteRequest={openDeleteDialog}
      />
    ),
  }));

  // ── Empty state ───────────────────────────────────────────────────────────

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
        <h3 className="text-base font-semibold text-foreground mb-1">
          No images yet.
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1 mb-4">
          Upload your first photo to get started.
        </p>
        <Link
          href="/admin/gallery/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upload image
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Save order banner */}
      {isDirty && (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 mb-4">
          <p className="text-sm text-foreground">
            Order changed — save to persist.
          </p>
          <Button
            size="sm"
            onClick={handleSaveOrder}
            disabled={isPendingSave}
            className="gap-1.5"
          >
            {isPendingSave ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <Save className="size-3.5" aria-hidden="true" />
            )}
            Save order
          </Button>
        </div>
      )}

      <SortableList
        items={sortableItems}
        onReorder={handleReorder}
        layout="grid"
      />

      {/* Delete confirm dialog */}
      {deleteDialog.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeDeleteDialog}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2
              id="delete-dialog-title"
              className="text-base font-semibold text-foreground mb-2"
            >
              Delete image?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete &ldquo;{deleteDialog.alt}&rdquo; and
              remove it from storage. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={closeDeleteDialog}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                disabled={isPendingDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
