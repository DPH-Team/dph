import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function CareersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Careers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Post open positions and review applicants. Resume downloads land
          directly in your inbox.
        </p>
      </div>
      <ComingSoonCard section="Careers" />
    </div>
  );
}
