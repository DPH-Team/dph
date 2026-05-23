import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"
import { getPublicWeeklyHours, getPublicHoursOverrides } from "@/lib/db/public"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [hours, overrides] = await Promise.all([
    getPublicWeeklyHours(),
    getPublicHoursOverrides(),
  ])

  return (
    <>
      <SiteHeader hours={hours} overrides={overrides} />
      <main id="main-content" className="flex flex-col min-h-svh">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
