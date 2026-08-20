import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import { getPublicCareerPostings, getPublicContentBlock } from "@/lib/db/public"
import { resolveContentIcon } from "@/lib/content-icons-resolve"
import { PageHero } from "@/components/marketing/PageHero"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { SectionHeading } from "@/components/marketing/SectionHeading"
import { ScrollReveal } from "@/components/motion/ScrollReveal"
import { CareersPageClient } from "./CareersPageClient"

export const metadata: Metadata = pageMetadata({
  title: "Careers",
  description: "Hiring people who give a damn. Open roles at District Pour Haus.",
  path: "/careers",
})

export default async function CareersPage() {
  const [careers, positions] = await Promise.all([
    getPublicContentBlock('careers_body')(),
    getPublicCareerPostings(),
  ])

  return (
    <>
      <PageHero
        eyebrow={careers.eyebrow}
        title={careers.headline}
        lead={careers.lead}
      />

      {/* Why us strip */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading eyebrow={careers.whyEyebrow}>{careers.whyHeading}</SectionHeading>
          <div className="mt-6 grid sm:grid-cols-3 gap-6">
            {careers.whyUs.map(({ icon, title, description }) => {
              const Icon = resolveContentIcon(icon, "dollar-sign")
              return (
                <ScrollReveal key={title}>
                  <div className="flex flex-col gap-3 p-5 rounded-xl bg-background border border-border">
                    <div className="flex items-center gap-2">
                      <Icon size={20} className="text-primary shrink-0" aria-hidden="true" />
                      <h3 className="font-display font-medium text-base text-foreground">{title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        </Container>
      </Section>

      {/* Open positions + application form */}
      <Section padding="md">
        <Container size="lg">
          <div className="flex flex-col gap-10">
            <div>
              <SectionHeading eyebrow="Hiring now">Open positions</SectionHeading>
              <div className="mt-1 text-sm text-muted-foreground">
                {positions.length === 0
                  ? "No open roles right now — check back soon."
                  : `${positions.length} role${positions.length > 1 ? "s" : ""} open`}
              </div>
            </div>

            {positions.length > 0 && (
              <CareersPageClient positions={positions} />
            )}

            {positions.length === 0 && (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <p className="text-muted-foreground">
                  We&apos;re not actively hiring right now, but we&apos;re always interested in great people.
                  Feel free to reach out at{" "}
                  <a
                    href="mailto:info@districtpourhaus.com"
                    className="text-primary hover:text-copper-hover transition-colors"
                  >
                    info@districtpourhaus.com
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </>
  )
}
