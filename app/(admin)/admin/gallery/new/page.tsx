import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listGalleryImages } from '@/lib/db/queries/gallery';
import { createGalleryImageAction } from '@/app/(admin)/admin/gallery/actions';
import { GalleryForm } from '@/app/(admin)/admin/gallery/GalleryForm';

// ─── Distinct tags helper ─────────────────────────────────────────────────────

async function getDistinctTags(): Promise<string[]> {
  const images = await listGalleryImages();
  const set = new Set<string>();
  for (const img of images) {
    for (const tag of img.tags) {
      set.add(tag);
    }
  }
  return Array.from(set).sort();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GalleryNewPage() {
  await requireStaff();
  const tagSuggestions = await getDistinctTags();

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link
            href="/admin/gallery"
            className="hover:text-foreground transition-colors"
          >
            Gallery
          </Link>
          {' › '}
          <span>Upload image</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">Upload image</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a photo to the gallery. Add alt text and optional tags.
        </p>
      </header>

      <GalleryForm
        mode="create"
        action={createGalleryImageAction}
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
}
