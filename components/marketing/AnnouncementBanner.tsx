import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/marketing/layout/Container"
import { cn } from "@/lib/utils"

export type AnnouncementBannerProps = {
  title: string
  subtext?: string | null
  buttonLabel?: string | null
  buttonHref?: string | null
}

export function AnnouncementBanner({
  title,
  subtext,
  buttonLabel,
  buttonHref,
}: AnnouncementBannerProps) {
  if (!title) return null

  const hasButton = Boolean(buttonLabel && buttonHref)
  const isExternal = Boolean(buttonHref && /^https?:\/\//.test(buttonHref))

  return (
    <section
      aria-label="Site announcement"
      className="relative isolate w-full overflow-hidden bg-packers-gold print:hidden animate-banner-drop motion-reduce:animate-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[28%] bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.25)_35%,rgba(255,255,255,0.55)_50%,rgba(255,255,255,0.25)_65%,transparent_100%)] animate-banner-ripple-right motion-reduce:hidden"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-1/2 z-0 w-[28%] bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.25)_35%,rgba(255,255,255,0.55)_50%,rgba(255,255,255,0.25)_65%,transparent_100%)] animate-banner-ripple-left motion-reduce:hidden"
      />
      <Container
        size="xl"
        className={cn(
          "relative z-10 flex flex-col items-center gap-3 py-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:py-6 sm:text-left",
          hasButton ? "sm:justify-between" : "sm:justify-center"
        )}
      >
        <div className="flex min-w-0 flex-col items-center gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span
            aria-hidden="true"
            className="hidden sm:block size-3 shrink-0 rotate-45 bg-packers-green self-center animate-diamond-pulse motion-reduce:animate-none"
          />
          <p className="font-display text-lg sm:text-2xl font-bold uppercase tracking-[0.01em] leading-tight text-packers-green">
            {title}
          </p>
          {subtext && (
            <p className="text-[0.8125rem] sm:text-[0.9375rem] font-medium text-packers-green">{subtext}</p>
          )}
        </div>

        {hasButton && buttonHref && buttonLabel && (
          isExternal ? (
            <span className="relative flex w-full shrink-0 sm:w-auto">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-lg animate-cta-halo motion-reduce:hidden"
              />
              <Button
                variant="secondary"
                size="default"
                nativeButton={false}
                className="relative w-full font-semibold transition-colors bg-packers-green text-cream border-packers-green hover:bg-packers-green-bright hover:border-packers-green-bright active:bg-brand-base active:border-brand-base focus-visible:ring-brand-base focus-visible:ring-offset-packers-gold"
                render={<a href={buttonHref} target="_blank" rel="noopener noreferrer" />}
              >
                {buttonLabel}
                <ExternalLink aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </Button>
            </span>
          ) : (
            <span className="relative flex w-full shrink-0 sm:w-auto">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-lg animate-cta-halo motion-reduce:hidden"
              />
              <Button
                variant="secondary"
                size="default"
                nativeButton={false}
                className="relative w-full font-semibold transition-colors bg-packers-green text-cream border-packers-green hover:bg-packers-green-bright hover:border-packers-green-bright active:bg-brand-base active:border-brand-base focus-visible:ring-brand-base focus-visible:ring-offset-packers-gold"
                render={<Link href={buttonHref} />}
              >
                {buttonLabel}
              </Button>
            </span>
          )
        )}
      </Container>
    </section>
  )
}
