import { Plug, TriangleAlert } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { listIntegrations } from '@/lib/db/queries/integrations';
import { IntegrationCard } from './IntegrationCard';
import type { Integration } from '@/lib/db/schema';
import type { IntegrationName } from '@/lib/validators/integrations';

export default async function IntegrationsPage() {
  await requireAdmin();

  const integrations = await listIntegrations();

  // Build a map for deterministic rendering (untappd first, printify second).
  const byName = new Map<IntegrationName, Integration>();
  for (const row of integrations) {
    byName.set(row.name as IntegrationName, row);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <div className="flex items-center gap-2">
          <Plug className="size-5 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">
            Integrations
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure Untappd and Printify. Test connections before going live.
        </p>
      </header>

      {/* Warning callout */}
      <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <TriangleAlert
          className="mt-0.5 size-4 shrink-0 text-amber-400"
          aria-hidden="true"
        />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-amber-300">Phase 6 credentials</p>
          <p className="text-muted-foreground">
            These credentials power the live tap list, events sync, and merch
            grid when Phase 6 is activated. Toggling{' '}
            <span className="font-medium text-amber-400">mode</span> to{' '}
            <span className="font-medium text-amber-400">live</span> switches
            the public site away from mock fixtures and begins making real API
            calls. Test each connection before enabling live mode. Rotating
            the encryption key (
            <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              INTEGRATIONS_ENCRYPTION_KEY
            </code>
            ) will invalidate stored credentials — re-enter them after any
            rotation.
          </p>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(['untappd', 'printify'] as IntegrationName[]).map((name) => {
          const row = byName.get(name);
          if (!row) return null;
          return <IntegrationCard key={name} integration={row} />;
        })}
      </div>
    </div>
  );
}
