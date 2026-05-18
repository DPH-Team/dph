import type { Metadata } from "next"
import Link from "next/link"
import { Phone, Mail, MapPin, ParkingCircle, Bus, Accessibility } from "lucide-react"
import { pageMetadata } from "@/lib/seo"
import { getLocation, getWeeklyHours, getHoursOverrides } from "@/lib/fixtures"
import { PageHero } from "@/components/marketing/PageHero"
import { HoursCard } from "@/components/marketing/HoursCard"
import { MapBlock } from "@/components/marketing/MapBlock"
import { GameDayBanner } from "@/components/marketing/GameDayBanner"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { SectionHeading } from "@/components/marketing/SectionHeading"
import { ScrollReveal } from "@/components/motion/ScrollReveal"

export const metadata: Metadata = pageMetadata({
  title: "Contact — District Pour Haus",
  description: "Find us, call us, park easy. Open seven days a week.",
  path: "/contact",
})

export default async function ContactPage() {
  const [location, hours, overrides] = await Promise.all([
    getLocation(),
    getWeeklyHours(),
    getHoursOverrides(),
  ])

  const formattedAddress = `${location.address}, ${location.city}, ${location.state} ${location.zip}`

  return (
    <>
      {/* Conditional Game Day Banner */}
      {location.isGameDay && location.gameDayKickoff && location.gameDayOpponent && (
        <GameDayBanner
          kickoff={location.gameDayKickoff}
          opponent={location.gameDayOpponent}
        />
      )}

      <PageHero
        eyebrow="Find us"
        title="Find Us"
        lead="We're in the heart of Green Bay. Easy parking, accessible entrance, and the tap wall's always ready."
      />

      {/* Location card 2-col */}
      <Section padding="md">
        <Container>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: address + contact */}
            <ScrollReveal>
              <div className="flex flex-col gap-6">
                <SectionHeading eyebrow="Visit">Our location</SectionHeading>

                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={16}
                      className="text-muted-foreground mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">{location.name}</p>
                      <p className="text-sm text-muted-foreground">{formattedAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone
                      size={16}
                      className="text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    <Link
                      href={`tel:${location.phone.replace(/\D/g, "")}`}
                      className="text-sm text-primary hover:text-[--color-copper-hover] transition-colors font-medium"
                      aria-label={`Call us at ${location.phone}`}
                    >
                      {location.phone}
                    </Link>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail
                      size={16}
                      className="text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    <Link
                      href={`mailto:${location.email}`}
                      className="text-sm text-primary hover:text-[--color-copper-hover] transition-colors"
                    >
                      {location.email}
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: Hours card */}
            <ScrollReveal delay={0.1}>
              <div className="rounded-xl bg-card border border-border p-5 sm:p-6">
                <HoursCard hours={hours} overrides={overrides} />
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </Section>

      {/* Map block */}
      <Section padding="sm">
        <Container>
          <MapBlock
            lat={location.lat}
            lng={location.lng}
            address={formattedAddress}
            markerLabel={location.name}
            variant="interactive"
          />
        </Container>
      </Section>

      {/* Getting here */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading eyebrow="Directions">Getting here</SectionHeading>
          <div className="mt-6 grid sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ParkingCircle
                  size={20}
                  className="text-primary shrink-0"
                  aria-hidden="true"
                />
                <h3 className="font-medium text-foreground text-sm">Parking</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {location.parkingNotes}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Bus
                  size={20}
                  className="text-primary shrink-0"
                  aria-hidden="true"
                />
                <h3 className="font-medium text-foreground text-sm">Transit &amp; rideshare</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {location.transitNotes}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Accessibility
                  size={20}
                  className="text-primary shrink-0"
                  aria-hidden="true"
                />
                <h3 className="font-medium text-foreground text-sm">Accessibility</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {location.accessibilityNotes}
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
