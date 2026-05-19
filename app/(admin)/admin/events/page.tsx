import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function EventsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create and manage taproom events, shows, and specials.
        </p>
      </div>
      <ComingSoonCard section="Events" />
    </div>
  );
}
