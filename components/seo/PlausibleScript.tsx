/**
 * components/seo/PlausibleScript.tsx
 *
 * Async server component — reads Plausible config server-side and conditionally
 * renders the analytics script tag. Renders nothing when:
 *   - The integration is disabled, OR
 *   - No domain has been configured.
 *
 * The script is cookieless and requires no cookie banner.
 *
 * PLACEMENT: Only used in the public (public) layout — never loaded on admin
 * or login routes.
 */

import Script from 'next/script';
import { getPlausibleConfig } from '@/lib/db/queries/integrations';

export async function PlausibleScript() {
  const config = await getPlausibleConfig();

  // Emit nothing if not configured or not enabled.
  if (!config || !config.enabled || !config.domain) {
    return null;
  }

  const host = config.host.replace(/\/$/, ''); // strip trailing slash if any
  const src = `${host}/js/script.js`;

  return (
    <Script
      src={src}
      // defer — does not block rendering; Plausible's own recommended strategy.
      strategy="afterInteractive"
      data-domain={config.domain}
    />
  );
}
