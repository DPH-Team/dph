import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { cn } from "@/lib/utils"

export type LegalPageProps = {
  title: string
  updatedAt: string
  eyebrow?: string
  children: React.ReactNode
  className?: string
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function LegalPage({ title, updatedAt, eyebrow = "Legal", children, className }: LegalPageProps) {
  return (
    <>
      <header className="relative overflow-hidden border-b border-border/60 bg-background">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_-10%,oklch(0.648_0.130_47_/_0.16),transparent_55%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-copper/60 to-transparent"
        />
        <Container className="relative [padding-block:clamp(2rem,5vw,3.5rem)]">
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium tracking-widest uppercase text-packers-gold">
                {eyebrow}
              </p>
              <div
                className="flex-1 h-px bg-packers-gold opacity-40"
                aria-hidden="true"
              />
            </div>
            <h1 className="font-display font-medium text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-[1.08] tracking-[-0.02em] text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: {formatDate(updatedAt)}
            </p>
          </div>
        </Container>
      </header>

      <Section padding="md" className={cn("bg-background", className)}>
        <Container size="md">
          <div className="flex flex-col gap-6 max-w-prose">
            {children}
          </div>
        </Container>
      </Section>
    </>
  )
}

export function LegalBody({ paragraphs }: { paragraphs: string[] }) {
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-base text-muted-foreground leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-copper-hover">
          {p}
        </p>
      ))}
    </>
  )
}
