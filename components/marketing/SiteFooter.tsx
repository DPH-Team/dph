import Link from "next/link"
import { Link2 } from "lucide-react"
import { Wordmark } from "./Wordmark"
import { NewsletterCTA } from "./NewsletterCTA"
import { Container } from "@/components/marketing/layout/Container"

const EXPLORE_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/taps", label: "Taps" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/merch", label: "Merch" },
  { href: "/careers", label: "Careers" },
]

const currentYear = new Date().getFullYear()

export function SiteFooter() {
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
                <span>123 Main Street</span>
                <span>Green Bay, WI 54301</span>
                <a
                  href="tel:+19205550142"
                  className="text-primary hover:text-[--color-copper-hover] transition-colors w-fit"
                >
                  (920) 555-0142
                </a>
                <a
                  href="mailto:hello@districtpourhaus.com"
                  className="text-primary hover:text-[--color-copper-hover] transition-colors w-fit"
                >
                  hello@districtpourhaus.com
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
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
              className="hover:text-[--color-packers-gold] transition-colors"
            >
              Privacy
            </Link>
            <span aria-hidden="true"> · </span>
            <Link
              href="/terms"
              className="hover:text-[--color-packers-gold] transition-colors"
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
              className="text-[--color-packers-gold] hover:opacity-80 transition-opacity"
            >
              <Link2 size={16} aria-hidden="true" />
            </a>
          </div>
        </Container>
      </div>
    </footer>
  )
}
