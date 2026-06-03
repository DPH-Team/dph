import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"
import { getPublicWeeklyHours, getPublicHoursOverrides } from "@/lib/db/public"
import { getLocation } from "@/app/__fixtures__/location"
import { JsonLd } from "@/components/seo/JsonLd"
import { PlausibleScript } from "@/components/seo/PlausibleScript"
import { restaurantJsonLd } from "@/lib/seo"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [hours, overrides, location] = await Promise.all([
    getPublicWeeklyHours(),
    getPublicHoursOverrides(),
    getLocation(),
  ])

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-copper focus:text-brand-base focus:font-medium focus:text-sm focus:ring-2 focus:ring-copper focus:ring-offset-2 focus:ring-offset-background focus:outline-none"
      >
        Skip to content
      </a>
      <JsonLd data={restaurantJsonLd(location, hours)} />
      {/* Plausible analytics — server-side gated; renders nothing until the
          integration is enabled with a domain set in the admin panel. Never
          loaded on admin or login routes (those use a separate route group). */}
      <PlausibleScript />
      <SiteHeader hours={hours} overrides={overrides} location={location} />
      <main id="main-content" tabIndex={-1} className="flex flex-col min-h-svh outline-none">
        {children}
      </main>
      <SiteFooter location={location} />
    </>
  )
}
