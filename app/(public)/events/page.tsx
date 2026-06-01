import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import {
  getPublicUpcomingEvents,
  getPublicPastEvents,
  getEventsSyncStatusCached,
} from "@/lib/db/public"
import { PageHero } from "@/components/marketing/PageHero"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { EventsClient } from "./EventsClient"
import { CalendarX } from "lucide-react"

export const metadata: Metadata = pageMetadata({
  title: "Events — District Pour Haus",
  description: "Live music, trivia, game-day specials, and private events at District Pour Haus.",
  path: "/events",
})

function formatLastSynced(iso: string | null): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export default async function EventsPage() {
  const [upcomingResult, pastResult, syncStatus] = await Promise.all([
    getPublicUpcomingEvents(),
    getPublicPastEvents(),
    getEventsSyncStatusCached(),
  ])

  const upcoming = upcomingResult.data
  const past = pastResult.data
  const isEmpty = upcoming.length === 0 && past.length === 0

  return (
    <>
      <PageHero
        title="Events"
        lead="Live music, trivia nights, Packers watch parties, and more. Check back often — we keep things moving."
      />
      <Section padding="sm">
        <Container>
          {isEmpty ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <CalendarX
                size={40}
                className="text-muted-foreground/50"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1">
                <p className="text-base font-medium text-foreground">
                  No events on the calendar right now
                </p>
                <p className="text-sm text-muted-foreground">
                  Check back soon — we&apos;re always planning something.
                </p>
              </div>
            </div>
          ) : (
            <EventsClient upcoming={upcoming} past={past} />
          )}

          <p className="mt-8 text-xs text-muted-foreground text-center">
            Last updated: {formatLastSynced(syncStatus.lastSyncedAt)}
          </p>
        </Container>
      </Section>
    </>
  )
}
