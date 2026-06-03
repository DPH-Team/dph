import type { Metadata } from "next"
import Link from "next/link"
import { Phone, MapPin } from "lucide-react"
import { pageMetadata } from "@/lib/seo"
import { getFaqEntries } from "@/app/__fixtures__/faq"
import { getLocation } from "@/app/__fixtures__/location"
import { PageHero } from "@/components/marketing/PageHero"
import { FaqAccordion } from "@/components/marketing/FaqAccordion"
import { InquiryForm } from "@/components/marketing/forms/InquiryForm"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { SectionHeading } from "@/components/marketing/SectionHeading"

export const metadata: Metadata = pageMetadata({
  title: "Reserve · Inquire",
  description: "Reserve a table, plan a private event, or send us a note.",
  path: "/reservations",
})

export default async function ReservationsPage() {
  const [faq, location] = await Promise.all([getFaqEntries(), getLocation()])

  const reservationFaq = faq.filter(
    (f) => f.category === "reservations" || f.category === "self-pour" || f.category === "venue",
  )

  const formattedAddress = `${location.address}, ${location.city}, ${location.state} ${location.zip}`

  return (
    <>
      <PageHero
        eyebrow="Plan a visit"
        title="Reserve · Inquire"
        lead="Use this form for table reservations, private events, press inquiries, or anything else. We'll email you back within one business day."
      />

      {/* Form */}
      <Section padding="md">
        <Container size="md">
          <div className="rounded-2xl bg-card border border-border p-6 sm:p-8">
            <InquiryForm defaultType="reservation" />
          </div>
        </Container>
      </Section>

      {/* FAQ */}
      <Section padding="md" bg="card">
        <Container size="md">
          <SectionHeading eyebrow="Common questions">FAQ</SectionHeading>
          <div className="mt-6">
            <FaqAccordion entries={reservationFaq} />
          </div>
        </Container>
      </Section>

      {/* Visit us strip */}
      <Section padding="sm">
        <Container size="md">
          <div className="rounded-xl bg-card border border-border p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start">
            <div className="flex flex-col gap-3">
              <h3 className="font-display font-medium text-lg text-foreground">
                Rather talk to us?
              </h3>
              <div className="flex flex-col gap-2">
                <Link
                  href={`tel:${location.phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-2 text-sm text-primary hover:text-copper-hover transition-colors font-medium"
                  aria-label={`Call us at ${location.phone}`}
                >
                  <Phone size={14} aria-hidden="true" />
                  {location.phone}
                </Link>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {formattedAddress}
                </p>
              </div>
            </div>
            <div className="sm:ml-auto shrink-0">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Full directions & hours →
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  )
}
