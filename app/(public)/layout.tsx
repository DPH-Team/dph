import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"
import { getWeeklyHours, getHoursOverrides } from "@/lib/fixtures"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [hours, overrides] = await Promise.all([
    getWeeklyHours(),
    getHoursOverrides(),
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
