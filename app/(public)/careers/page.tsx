import type { Metadata } from "next"
import { DollarSign, TrendingUp, Heart } from "lucide-react"
import { pageMetadata } from "@/lib/seo"
import { getPublicCareerPostings } from "@/lib/db/public"
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

const WHY_US = [
  {
    icon: DollarSign,
    title: "Competitive pay",
    description:
      "We pay above market for every role — front of house, kitchen, and operations. We review comp annually and give increases based on performance, not tenure alone.",
  },
  {
    icon: TrendingUp,
    title: "Real tips",
    description:
      "Self-pour means higher check averages and happy guests who've chosen exactly what they want. That translates into better tips for the team on the floor.",
  },
  {
    icon: Heart,
    title: "The vibe is the job",
    description:
      "We're a community taproom. Game days, live music, trivia nights — it's a great place to work because it's a great place to be. No drama, no ego, just good beer and good people.",
  },
] as const

export default async function CareersPage() {
  const positions = await getPublicCareerPostings()

  return (
    <>
      <PageHero
        eyebrow="Hiring"
        title="Work With Us"
        lead="We're hiring people who give a damn. If you care about craft, community, and showing up for your team, this is your place."
      />

      {/* Why us strip */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading eyebrow="Why DPH">What we offer</SectionHeading>
          <div className="mt-6 grid sm:grid-cols-3 gap-6">
            {WHY_US.map(({ icon: Icon, title, description }) => (
              <ScrollReveal key={title}>
                <div className="flex flex-col gap-3 p-5 rounded-xl bg-background border border-border">
                  <div className="flex items-center gap-2">
                    <Icon size={20} className="text-primary shrink-0" aria-hidden="true" />
                    <h3 className="font-display font-medium text-base text-foreground">{title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </ScrollReveal>
            ))}
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
