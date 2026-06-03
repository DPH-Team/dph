import { Plug } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { listIntegrations } from '@/lib/db/queries/integrations';
import { IntegrationCard, type IntegrationView } from './IntegrationCard';
import { PlausibleCard } from './PlausibleCard';
import { ResendCard } from './ResendCard';
import { InstagramCard } from './InstagramCard';
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

  // Resend config (non-secret sender addresses) from the `config` jsonb column.
  const resendRow = byName.get('resend');
  const resendConfig =
    resendRow?.config &&
    typeof resendRow.config === 'object' &&
    !Array.isArray(resendRow.config)
      ? (resendRow.config as Record<string, unknown>)
      : {};

  // Instagram config (Behold feed_id) from the `config` jsonb column.
  const instagramRow = byName.get('instagram');
  const instagramConfig =
    instagramRow?.config &&
    typeof instagramRow.config === 'object' &&
    !Array.isArray(instagramRow.config)
      ? (instagramRow.config as Record<string, unknown>)
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
          Configure Untappd, Printify, Plausible Analytics, Resend email, and Instagram.
        </p>
      </header>

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

      {/* Resend card */}
      {resendRow && (
        <ResendCard
          enabled={resendRow.enabled}
          hasCredentials={resendRow.hasCredentials}
          fromEmail={typeof resendConfig.from_email === 'string' ? resendConfig.from_email : ''}
          replyTo={typeof resendConfig.reply_to === 'string' ? resendConfig.reply_to : ''}
          lastTestStatus={resendRow.lastTestStatus}
          lastTestedAt={resendRow.lastTestedAt ? new Date(resendRow.lastTestedAt) : null}
          lastTestError={resendRow.lastTestError}
        />
      )}

      {/* Instagram card */}
      {instagramRow && (
        <InstagramCard
          enabled={instagramRow.enabled}
          feedId={typeof instagramConfig.feed_id === 'string' ? instagramConfig.feed_id : ''}
        />
      )}
    </div>
  );
}
