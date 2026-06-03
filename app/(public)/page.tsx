import type { Metadata } from "next"
import Link from "next/link"
import { pageMetadata } from "@/lib/seo"
import { getPublicContentBlock, getPublicMenu, getPublicWeeklyHours, getPublicHoursOverrides } from "@/lib/db/public"
import { getPublicUpcomingEvents } from "@/lib/db/public"
import { fetchIgPosts } from "@/lib/instagram"
import { fetchCheckins } from "@/lib/untappd"
import { getLocation } from "@/app/__fixtures__/location"
import { HomeHero } from "@/components/marketing/HomeHero"
import { EventCard } from "@/components/marketing/EventCard"
import { MenuItem } from "@/components/marketing/MenuItem"
import { HoursCard } from "@/components/marketing/HoursCard"
import { MapBlock } from "@/components/marketing/MapBlock"
import { InstagramSlot } from "@/components/marketing/InstagramSlot"
import { CheckinsTicker } from "@/components/marketing/CheckinsTicker"
import { NewsletterCTA } from "@/components/marketing/NewsletterCTA"
import { SectionHeading } from "@/components/marketing/SectionHeading"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { ScrollReveal } from "@/components/motion/ScrollReveal"
import { Stagger, StaggerItem } from "@/components/motion/Stagger"

const _baseMeta = pageMetadata({
  title: "Our Haus is Your Haus",
  description:
    "Wisconsin self-pour taproom with 48 craft taps, scratch kitchen, and live events. Our Haus is Your Haus.",
  path: "/",
})

export const metadata: Metadata = {
  ..._baseMeta,
  title: {
    absolute: "District Pour Haus — Our Haus is Your Haus",
  },
}

const FEATURED_ITEM_COUNT = 4

export default async function HomePage() {
  const [hero, callouts, sections, hours, overrides, events, igPostsResult, checkinsResult, loc] =
    await Promise.all([
      getPublicContentBlock('home_hero')(),
      getPublicContentBlock('home_callouts')(),
      getPublicMenu(),
      getPublicWeeklyHours(),
      getPublicHoursOverrides(),
      getPublicUpcomingEvents(),
      fetchIgPosts(),
      fetchCheckins(),
      getLocation(),
    ])

  const igPosts = igPostsResult.data
  const checkins = checkinsResult.data

  const upcomingThree = events.data.slice(0, 3)

  // No featured flag in schema — take the first N available items across all sections.
  const featuredItems = sections
    .flatMap((s) => s.items)
    .slice(0, FEATURED_ITEM_COUNT)

  const calloutsArray = callouts

  return (
    <>
      <HomeHero hero={hero} />

      <CheckinsTicker initial={checkins} />

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
              className="text-sm font-medium text-primary hover:text-copper-hover transition-colors underline underline-offset-4"
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
              className="text-sm font-medium text-primary hover:text-copper-hover transition-colors underline underline-offset-4"
            >
              See full menu →
            </Link>
          </div>
        </Container>
      </Section>

      {/* Home callouts — rendered only when the admin has saved at least one callout */}
      {calloutsArray.length > 0 && (
        <Section padding="md" className="bg-background">
          <Container>
            <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {calloutsArray.map((callout) => (
                <StaggerItem key={callout.title}>
                  <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 h-full">
                    {callout.eyebrow && (
                      <p className="text-xs font-medium tracking-widest uppercase text-primary">
                        {callout.eyebrow}
                      </p>
                    )}
                    <h3 className="font-display font-medium text-xl leading-snug text-foreground">
                      {callout.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {callout.body}
                    </p>
                    {callout.href && callout.cta && (
                      <Link
                        href={callout.href}
                        className="text-sm font-medium text-primary hover:text-copper-hover transition-colors underline underline-offset-4 self-start"
                      >
                        {callout.cta} →
                      </Link>
                    )}
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </Section>
      )}

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
