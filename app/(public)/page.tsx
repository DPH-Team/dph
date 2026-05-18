import type { Metadata } from "next"
import Link from "next/link"
import { pageMetadata } from "@/lib/seo"
import {
  getHero,
  getUpcomingEvents,
  getFeaturedMenuItems,
  getWeeklyHours,
  getHoursOverrides,
  getIgPosts,
  getLocation,
} from "@/lib/fixtures"
import { HomeHero } from "@/components/marketing/HomeHero"
import { EventCard } from "@/components/marketing/EventCard"
import { MenuItem } from "@/components/marketing/MenuItem"
import { HoursCard } from "@/components/marketing/HoursCard"
import { MapBlock } from "@/components/marketing/MapBlock"
import { InstagramSlot } from "@/components/marketing/InstagramSlot"
import { NewsletterCTA } from "@/components/marketing/NewsletterCTA"
import { SectionHeading } from "@/components/marketing/SectionHeading"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { ScrollReveal } from "@/components/motion/ScrollReveal"
import { Stagger, StaggerItem } from "@/components/motion/Stagger"

export const metadata: Metadata = pageMetadata({
  title: "District Pour Haus — Our Haus is Your Haus",
  description:
    "Wisconsin self-pour taproom with 32 craft taps, scratch kitchen, and live events. Our Haus is Your Haus.",
  path: "/",
})

export default async function HomePage() {
  const [hero, events, featuredItems, hours, overrides, igPosts, loc] =
    await Promise.all([
      getHero(),
      getUpcomingEvents(),
      getFeaturedMenuItems(),
      getWeeklyHours(),
      getHoursOverrides(),
      getIgPosts(),
      getLocation(),
    ])

  const upcomingThree = events.slice(0, 3)

  return (
    <>
      <HomeHero hero={hero} />

      {/* Tap-counter strip */}
      <section className="bg-card [padding-block:clamp(1.5rem,4vw,2.5rem)]" aria-label="Tap count">
        <Container>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <p className="tabular-nums font-display font-medium text-[clamp(2rem,1.5rem+2.5vw,3.5rem)] leading-none text-primary">
              24 / 32
            </p>
            <div className="flex flex-col gap-0.5">
              <p className="text-foreground font-medium">pours flowing right now</p>
              <p className="text-xs text-muted-foreground">
                live from Untappd · refreshes every ~5 min
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Upcoming events strip */}
      <Section padding="md" className="bg-background">
        <Container>
          <ScrollReveal>
            <SectionHeading eyebrow="What's On" className="mb-8">
              What&apos;s Happening
            </SectionHeading>
          </ScrollReveal>

          {upcomingThree.length > 0 ? (
            <>
              {/* Desktop: 3-up grid */}
              <Stagger className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingThree.map((event) => (
                  <StaggerItem key={event.id}>
                    <EventCard event={event} variant={event.featured ? "featured" : "default"} />
                  </StaggerItem>
                ))}
              </Stagger>

              {/* Mobile: horizontal scroll */}
              <div className="sm:hidden -mx-4 px-4 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
                {upcomingThree.map((event) => (
                  <div key={event.id} className="snap-start shrink-0 w-[80vw] max-w-xs">
                    <EventCard event={event} variant={event.featured ? "featured" : "default"} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No upcoming events scheduled. Check back soon.</p>
          )}

          <div className="mt-8">
            <Link
              href="/events"
              className="text-sm font-medium text-primary hover:text-[--color-copper-hover] transition-colors underline underline-offset-4"
            >
              View all events →
            </Link>
          </div>
        </Container>
      </Section>

      {/* Featured menu */}
      <Section padding="md" bg="card">
        <Container>
          <ScrollReveal>
            <SectionHeading eyebrow="From the Kitchen" className="mb-8">
              From the Kitchen
            </SectionHeading>
          </ScrollReveal>

          <Stagger className="grid sm:grid-cols-2 gap-4">
            {featuredItems.map((item) => (
              <StaggerItem key={item.id}>
                <MenuItem item={item} variant="featured" />
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-8">
            <Link
              href="/menu"
              className="text-sm font-medium text-primary hover:text-[--color-copper-hover] transition-colors underline underline-offset-4"
            >
              See full menu →
            </Link>
          </div>
        </Container>
      </Section>

      {/* Hours / Location */}
      <Section padding="md" className="bg-background">
        <Container>
          <ScrollReveal>
            <SectionHeading eyebrow="Visit Us" className="mb-8">
              Hours &amp; Location
            </SectionHeading>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
            <ScrollReveal delay={0}>
              <div className="rounded-xl bg-card border border-border p-6">
                <HoursCard hours={hours} overrides={overrides} />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <MapBlock
                lat={loc.lat}
                lng={loc.lng}
                address={`${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`}
                markerLabel={loc.name}
                variant="placeholder"
                className="h-full min-h-[280px]"
              />
            </ScrollReveal>
          </div>
        </Container>
      </Section>

      {/* Instagram slot */}
      <Section padding="md" bg="card">
        <Container>
          <ScrollReveal>
            <SectionHeading eyebrow="@districtpourhaus" className="mb-8">
              Follow Along
            </SectionHeading>
          </ScrollReveal>

          <InstagramSlot posts={igPosts} />
        </Container>
      </Section>

      {/* Newsletter CTA */}
      <section className="bg-card relative [padding-block:clamp(4rem,9vw,7rem)]">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-primary"
          aria-hidden="true"
        />
        <Container size="md">
          <ScrollReveal>
            <div className="flex flex-col gap-4 items-center text-center">
              <h2 className="font-display font-medium text-[clamp(1.75rem,1.5rem+2vw,3rem)] leading-[1.15] tracking-[-0.02em] text-foreground">
                Pour-Over News, monthly
              </h2>
              <p className="text-muted-foreground max-w-md">
                New taps, upcoming events, and a recipe or two. No spam — just what&apos;s happening at the Haus.
              </p>
              <div className="w-full max-w-sm mt-2">
                <NewsletterCTA variant="section" />
              </div>
            </div>
          </ScrollReveal>
        </Container>
      </section>
    </>
  )
}
