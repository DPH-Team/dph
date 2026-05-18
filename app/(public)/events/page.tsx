import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import { getUpcomingEvents, getPastEvents } from "@/lib/fixtures"
import { PageHero } from "@/components/marketing/PageHero"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { EventsClient } from "./EventsClient"

export const metadata: Metadata = pageMetadata({
  title: "Events — District Pour Haus",
  description: "Live music, trivia, game-day specials, and private events at District Pour Haus.",
  path: "/events",
})

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(), getPastEvents()])

  return (
    <>
      <PageHero
        title="Events"
        lead="Live music, trivia nights, Packers watch parties, and more. Check back often — we keep things moving."
      />
      <Section padding="sm">
        <Container>
          <EventsClient upcoming={upcoming} past={past} />
        </Container>
      </Section>
    </>
  )
}
