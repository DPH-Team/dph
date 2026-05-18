import { cn } from "@/lib/utils"
import { Container } from "@/components/marketing/layout/Container"
import { Section } from "@/components/marketing/layout/Section"

export type PageHeroProps = {
  eyebrow?: string
  title: string
  lead?: string
  align?: "left" | "center"
  className?: string
  children?: React.ReactNode
}

export function PageHero({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  children,
}: PageHeroProps) {
  return (
    <Section
      padding="lg"
      className={cn("bg-background", className)}
    >
      <Container>
        <div
          className={cn(
            "flex flex-col gap-4 max-w-3xl",
            align === "center" && "mx-auto items-center text-center"
          )}
        >
          {eyebrow && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium tracking-widest uppercase text-[--color-packers-gold]">
                {eyebrow}
              </p>
              <div
                className="flex-1 h-px bg-[--color-packers-gold] opacity-40"
                aria-hidden="true"
              />
            </div>
          )}
          <h1 className="font-display font-medium text-[clamp(2.25rem,1.8rem+2.5vw,4rem)] leading-[1.1] tracking-[-0.02em] text-foreground">
            {title}
          </h1>
          {lead && (
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {lead}
            </p>
          )}
          {children}
        </div>
      </Container>
    </Section>
  )
}
