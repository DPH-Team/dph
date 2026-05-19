import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function IntegrationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure Untappd and Printify credentials. Test connections before
          going live.
        </p>
      </div>
      <ComingSoonCard section="Integrations panel" />
    </div>
  );
}
