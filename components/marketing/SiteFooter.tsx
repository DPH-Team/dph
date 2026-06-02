import Link from "next/link"
import { Link2 } from "lucide-react"
import { Wordmark } from "./Wordmark"
import { NewsletterCTA } from "./NewsletterCTA"
import { Container } from "@/components/marketing/layout/Container"
import type { Location } from "@/lib/fixtures/types"

const EXPLORE_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/taps", label: "Taps" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/merch", label: "Merch" },
  { href: "/careers", label: "Careers" },
]

const currentYear = new Date().getFullYear()

export type SiteFooterProps = {
  location: Pick<Location, "address" | "city" | "state" | "zip" | "phone" | "email">
}

export function SiteFooter({ location }: SiteFooterProps) {
  const phoneDigits = location.phone.replace(/\D/g, "")

  return (
    <footer aria-label="Site footer">
      <div className="bg-card">
        <Container>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 [padding-block:clamp(3rem,7vw,5rem)]">
            <div className="flex flex-col gap-3 lg:col-span-1">
              <Wordmark size="md" tone="gold" asLink={false} />
              <p className="text-sm text-[--color-cream]/90 font-medium">
                Our Haus is Your Haus
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Wisconsin self-pour taproom with 32 craft taps and a scratch kitchen in Green Bay.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                Visit
              </h3>
              <address className="not-italic flex flex-col gap-1.5 text-sm text-muted-foreground">
                <span>{location.address}</span>
                <span>{location.city}, {location.state} {location.zip}</span>
                <a
                  href={`tel:+1${phoneDigits}`}
                  className="text-primary hover:text-[--color-copper-hover] transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {location.phone}
                </a>
                <a
                  href={`mailto:${location.email}`}
                  className="text-primary hover:text-[--color-copper-hover] transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {location.email}
                </a>
              </address>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                Explore
              </h3>
              <nav aria-label="Footer navigation">
                <ul className="flex flex-col gap-1.5" role="list">
                  {EXPLORE_LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">
                Stay in the Loop
              </h3>
              <p className="text-sm text-muted-foreground">
                Monthly pour notes, event previews, and the occasional brat recipe.
              </p>
              <NewsletterCTA variant="footer" />
            </div>
          </div>
        </Container>
      </div>

      <div
        className="bg-[--color-packers-green] h-14 sm:h-16 flex items-center"
        aria-label="Brand footer"
      >
        <Container className="flex items-center justify-between gap-4">
          <p className="text-xs text-[--color-cream]/70">
            <span>© {currentYear} District Pour Haus</span>
            <span aria-hidden="true"> · </span>
            <Link
              href="/privacy"
              className="hover:text-[--color-packers-gold] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Privacy
            </Link>
            <span aria-hidden="true"> · </span>
            <Link
              href="/terms"
              className="hover:text-[--color-packers-gold] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Terms
            </Link>
          </p>

          <div className="flex items-center gap-3">
            <Wordmark size="sm" tone="gold" asLink={false} className="hidden md:block" />
            <span className="hidden md:block text-xs text-[--color-cream]/60">Est. Wisconsin</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://instagram.com/districtpourhaus"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="District Pour Haus on Instagram"
              className="text-[--color-packers-gold] hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <Link2 size={16} aria-hidden="true" />
            </a>
          </div>
        </Container>
      </div>
    </footer>
  )
}
