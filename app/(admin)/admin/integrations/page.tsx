import { Plug, TriangleAlert } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { listIntegrations } from '@/lib/db/queries/integrations';
import { IntegrationCard, type IntegrationView } from './IntegrationCard';
import { PlausibleCard } from './PlausibleCard';
import type { Integration } from '@/lib/db/schema';
import type { IntegrationName } from '@/lib/validators/integrations';

// Strip `credentials` (bytea / Uint8Array — not RSC-serializable) and
// replace it with a derived boolean before crossing into the Client Component.
function toView(row: Integration): IntegrationView {
  const creds = row.credentials as
    | { byteLength?: number; length?: number }
    | string
    | null
    | undefined;
  let hasCredentials = false;
  if (creds) {
    if (typeof creds === 'object' && 'byteLength' in creds) {
      hasCredentials = (creds.byteLength ?? 0) > 0;
    } else if (typeof creds === 'object' && 'length' in creds) {
      hasCredentials = (creds.length ?? 0) > 0;
    } else if (typeof creds === 'string') {
      hasCredentials = creds !== '\\x' && creds !== '';
    }
  }
  const { credentials: _omit, ...rest } = row;
  void _omit;
  return { ...rest, hasCredentials };
}

export default async function IntegrationsPage() {
  await requireAdmin();

  const integrations = await listIntegrations();

  // Build a map for deterministic rendering.
  const byName = new Map<IntegrationName, IntegrationView>();
  for (const row of integrations) {
    byName.set(row.name as IntegrationName, toView(row));
  }

  // Plausible config is stored in the `config` jsonb column (not encrypted).
  const plausibleRow = byName.get('plausible');
  const plausibleConfig =
    plausibleRow?.config &&
    typeof plausibleRow.config === 'object' &&
    !Array.isArray(plausibleRow.config)
      ? (plausibleRow.config as Record<string, unknown>)
      : {};

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
          Configure Untappd, Printify, and Plausible Analytics.
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

      {/* Untappd + Printify cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(['untappd', 'printify'] as IntegrationName[]).map((name) => {
          const row = byName.get(name);
          if (!row) return null;
          return <IntegrationCard key={name} integration={row} />;
        })}
      </div>

      {/* Plausible card */}
      {plausibleRow && (
        <PlausibleCard
          enabled={plausibleRow.enabled}
          domain={typeof plausibleConfig.domain === 'string' ? plausibleConfig.domain : ''}
          host={typeof plausibleConfig.host === 'string' ? plausibleConfig.host : 'https://plausible.io'}
        />
      )}
    </div>
  );
}
