import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listGalleryImages } from '@/lib/db/queries/gallery';
import { Button } from '@/components/ui/button';
import { GalleryGrid } from './GalleryGrid';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GalleryPage() {
  await requireStaff();

  const images = await listGalleryImages();

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Gallery</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload photos, add alt text, tag images, and drag them into the
            order you want them to appear.
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/gallery/new" />}
        >
          + Upload image
        </Button>
      </header>

      <GalleryGrid initialImages={images} />
    </div>
  );
}
