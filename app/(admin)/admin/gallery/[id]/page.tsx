import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { getGalleryImageById, listGalleryImages } from '@/lib/db/queries/gallery';
import { updateGalleryImageAction } from '@/app/(admin)/admin/gallery/actions';
import { GalleryForm } from '@/app/(admin)/admin/gallery/GalleryForm';

// ─── Distinct tags helper ─────────────────────────────────────────────────────

async function getDistinctTags(excludeId: string): Promise<string[]> {
  const images = await listGalleryImages();
  const set = new Set<string>();
  for (const img of images) {
    if (img.id === excludeId) continue;
    for (const tag of img.tags) {
      set.add(tag);
    }
  }
  return Array.from(set).sort();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GalleryEditPage({ params }: PageProps) {
  await requireStaff();

  const { id } = await params;

  const [image, tagSuggestions] = await Promise.all([
    getGalleryImageById(id),
    getDistinctTags(id),
  ]);

  if (!image) {
    notFound();
  }

  const boundAction = updateGalleryImageAction.bind(null, id);

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
          <span>Edit image</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">Edit image</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Update alt text, tags, or replace the image.
        </p>
      </header>

      <GalleryForm
        mode="edit"
        image={image}
        action={boundAction}
        tagSuggestions={tagSuggestions}
      />
    </div>
  );
}
