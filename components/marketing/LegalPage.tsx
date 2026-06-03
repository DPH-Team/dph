import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { cn } from "@/lib/utils"

export type LegalPageProps = {
  title: string
  updatedAt: string
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

export function LegalPage({ title, updatedAt, children, className }: LegalPageProps) {
  return (
    <>
      <Section padding="lg" className="bg-background">
        <Container size="md">
          <div className="flex flex-col gap-3">
            <h1 className="font-display font-medium text-[clamp(2rem,1.6rem+2vw,3.5rem)] leading-[1.1] tracking-[-0.02em] text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: {formatDate(updatedAt)}
            </p>
          </div>
        </Container>
      </Section>

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
