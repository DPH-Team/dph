import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"
import { getPublicWeeklyHours, getPublicHoursOverrides } from "@/lib/db/public"
import { getLocation } from "@/app/__fixtures__/location"
import { JsonLd } from "@/components/seo/JsonLd"
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
      <JsonLd data={restaurantJsonLd(location, hours)} />
      <SiteHeader hours={hours} overrides={overrides} location={location} />
      <main id="main-content" className="flex flex-col min-h-svh">
        {children}
      </main>
      <SiteFooter location={location} />
    </>
  )
}
