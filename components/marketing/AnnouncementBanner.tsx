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
      className="w-full bg-packers-green border-b border-packers-gold/40 print:hidden"
    >
      <Container
        size="xl"
        className={cn(
          "flex flex-col items-center gap-3 py-3.5 text-center sm:flex-row sm:items-center sm:gap-6 sm:py-3 sm:text-left",
          hasButton ? "sm:justify-between" : "sm:justify-center"
        )}
      >
        <div className="flex min-w-0 flex-col items-center gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span
            aria-hidden="true"
            className="hidden sm:block size-1.5 shrink-0 rotate-45 bg-packers-gold self-center"
          />
          <p className="font-display text-[0.9375rem] sm:text-base font-semibold tracking-[-0.01em] text-cream">
            {title}
          </p>
          {subtext && (
            <p className="text-[0.8125rem] sm:text-sm text-cream/80">{subtext}</p>
          )}
        </div>

        {hasButton && buttonHref && buttonLabel && (
          isExternal ? (
            <Button
              variant="default"
              size="sm"
              nativeButton={false}
              className="w-full shrink-0 sm:w-auto focus-visible:ring-offset-packers-green"
              render={<a href={buttonHref} target="_blank" rel="noopener noreferrer" />}
            >
              {buttonLabel}
              <ExternalLink aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              nativeButton={false}
              className="w-full shrink-0 sm:w-auto focus-visible:ring-offset-packers-green"
              render={<Link href={buttonHref} />}
            >
              {buttonLabel}
            </Button>
          )
        )}
      </Container>
    </section>
  )
}
