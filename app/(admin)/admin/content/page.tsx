import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function ContentPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Content</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edit hero copy, callouts, the about body, and other keyed content
          blocks that appear across the public site.
        </p>
      </div>
      <ComingSoonCard section="Content blocks" />
    </div>
  );
}
