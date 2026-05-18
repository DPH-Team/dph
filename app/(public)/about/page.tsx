import type { Metadata } from "next"
import Link from "next/link"
import { CreditCard, Beer, Receipt } from "lucide-react"
import { pageMetadata } from "@/lib/seo"
import { getAboutContent, getTeam } from "@/lib/fixtures"
import { PageHero } from "@/components/marketing/PageHero"
import { TeamCard } from "@/components/marketing/TeamCard"
import { SectionHeading } from "@/components/marketing/SectionHeading"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { ScrollReveal } from "@/components/motion/ScrollReveal"
import { Stagger, StaggerItem } from "@/components/motion/Stagger"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = pageMetadata({
  title: "About — District Pour Haus",
  description: "How District Pour Haus came to be — Wisconsin roots, RFID self-pour, craft beer first.",
  path: "/about",
})

const STEP_ICONS = {
  "credit-card": CreditCard,
  beer: Beer,
  receipt: Receipt,
} as const

export default async function AboutPage() {
  const [about, members] = await Promise.all([getAboutContent(), getTeam()])

  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title={about.headline}
        lead={about.lead}
      />

      {/* Story — 2-col long-form */}
      <Section padding="md" className="bg-background">
        <Container>
          <ScrollReveal>
            <div
              className="grid md:grid-cols-2 gap-8 lg:gap-16 text-base text-muted-foreground leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: about.storyHtml }}
            />
          </ScrollReveal>
        </Container>
      </Section>

      {/* Self-pour explainer — 3 steps */}
      <Section padding="md" bg="card">
        <Container>
          <ScrollReveal>
            <SectionHeading eyebrow="How It Works" className="mb-10">
              Self-Pour Made Simple
            </SectionHeading>
          </ScrollReveal>

          <Stagger className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {about.rfidSteps.map((step, index) => {
              const IconComponent =
                STEP_ICONS[step.icon as keyof typeof STEP_ICONS] ?? CreditCard
              return (
                <StaggerItem key={step.label} className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <span
                      className="font-display font-medium text-4xl leading-none text-primary tabular-nums shrink-0"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <IconComponent
                      size={28}
                      className="text-muted-foreground/60 mt-1 shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-display font-medium text-xl text-foreground">
                    {step.label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </StaggerItem>
              )
            })}
          </Stagger>
        </Container>
      </Section>

      {/* Team grid */}
      <Section padding="md" className="bg-background">
        <Container>
          <ScrollReveal>
            <SectionHeading eyebrow="The Crew" className="mb-10">
              Meet the Team
            </SectionHeading>
          </ScrollReveal>

          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {members.map((member) => (
              <StaggerItem key={member.id}>
                <TeamCard member={member} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* Values strip */}
      <Section padding="md" bg="card">
        <Container>
          <ScrollReveal>
            <SectionHeading eyebrow="What We Stand For" className="mb-10">
              Our Values
            </SectionHeading>
          </ScrollReveal>

          <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {about.values.map((value) => (
              <StaggerItem key={value.title}>
                <article
                  className={cn(
                    "flex flex-col gap-3 p-6 rounded-xl border border-border h-full",
                    value.isGameDay
                      ? "bg-[--color-packers-green]"
                      : "bg-card"
                  )}
                >
                  {value.isGameDay && (
                    <div className="w-8 h-0.5 bg-[--color-packers-gold]" aria-hidden="true" />
                  )}
                  <h3
                    className={cn(
                      "font-display font-medium text-lg leading-tight",
                      value.isGameDay
                        ? "text-[--color-packers-gold]"
                        : "text-foreground"
                    )}
                  >
                    {value.title}
                  </h3>
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      value.isGameDay
                        ? "text-[--color-cream]"
                        : "text-muted-foreground"
                    )}
                  >
                    {value.description}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      {/* CTA strip */}
      <Section padding="md" className="bg-background">
        <Container>
          <ScrollReveal>
            <div className="flex flex-col items-center text-center gap-6">
              <h2 className="font-display font-medium text-[clamp(1.75rem,1.5rem+1.5vw,2.75rem)] leading-[1.15] tracking-[-0.02em] text-foreground">
                Come See Us
              </h2>
              <p className="text-muted-foreground max-w-md">
                123 Main Street, Green Bay, WI. Open seven days a week. Door&apos;s always open.
              </p>
              <Button size="lg" render={<Link href="/contact" />}>
                Find Us
              </Button>
            </div>
          </ScrollReveal>
        </Container>
      </Section>
    </>
  )
}
