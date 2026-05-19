import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function GalleryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Gallery</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload photos, add alt text, tag images, and drag them into the
          order you want them to appear.
        </p>
      </div>
      <ComingSoonCard section="Gallery" />
    </div>
  );
}
