import { cn } from "@/lib/utils"
import { Container } from "@/components/marketing/layout/Container"

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
    <header
      className={cn(
        "relative overflow-hidden border-b border-border/60 bg-background",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_-10%,oklch(0.648_0.130_47_/_0.16),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-copper/60 to-transparent"
      />
      <Container className="relative [padding-block:clamp(2rem,5vw,3.5rem)]">
        <div
          className={cn(
            "flex flex-col gap-4 max-w-3xl",
            align === "center" && "mx-auto items-center text-center"
          )}
        >
          {eyebrow && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium tracking-widest uppercase text-packers-gold">
                {eyebrow}
              </p>
              <div
                className="flex-1 h-px bg-packers-gold opacity-40"
                aria-hidden="true"
              />
            </div>
          )}
          <h1 className="font-display font-medium text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-[1.08] tracking-[-0.02em] text-foreground">
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
    </header>
  )
}
