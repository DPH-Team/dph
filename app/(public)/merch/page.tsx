import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import { fetchProducts } from "@/lib/printify"
import { PRINTIFY_STORE_URL } from "@/lib/fixtures/merch"
import { PageHero } from "@/components/marketing/PageHero"
import { MerchBrowser } from "@/components/marketing/MerchBrowser"
import { Wordmark } from "@/components/marketing/Wordmark"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { ScrollReveal } from "@/components/motion/ScrollReveal"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export const metadata: Metadata = pageMetadata({
  title: "Merch",
  description: "Limited-run District Pour Haus merch. Wear the Wisconsin.",
  path: "/merch",
})

export default async function MerchPage() {
  const { data: products } = await fetchProducts()

  return (
    <>
      <PageHero
        eyebrow="Wear it"
        title="Merch"
        lead="Limited-run drops, sign-styled gear, Wisconsin through and through."
      >
        <div className="mt-2">
          <Button
            size="default"
            render={
              <a
                href={PRINTIFY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Open Pop-Up Store
            <ExternalLink size={14} aria-hidden="true" />
          </Button>
        </div>
      </PageHero>

      {/* Promo card — sign-styled, Packers green */}
      <Section padding="sm" className="bg-background">
        <Container>
          <ScrollReveal>
            <section
              className="rounded-2xl bg-packers-green p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              aria-label="Featured merch promo"
            >
              <div className="flex flex-col gap-3">
                <Wordmark size="lg" tone="gold" asLink={false} />
                <p className="text-cream text-base sm:text-lg font-medium">
                  Sign-styled drops · limited runs.
                </p>
                <p className="text-cream/70 text-sm max-w-sm">
                  Every piece is designed to look like it came off the exterior sign. Because it did.
                </p>
              </div>
              <a
                href={PRINTIFY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-copper-hover active:bg-copper-active transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-packers-green shrink-0"
              >
                Shop Now
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </section>
          </ScrollReveal>
        </Container>
      </Section>

      {/* Product grid with category filter + infinite scroll */}
      <Section padding="md" className="bg-background">
        <Container>
          <MerchBrowser products={products} />

          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              All orders fulfilled via Printify. Returns accepted within 30 days for unworn, unwashed items in original condition.
              Contact{" "}
              <a
                href="mailto:info@districtpourhaus.com"
                className="text-primary hover:text-copper-hover transition-colors underline underline-offset-4"
              >
                info@districtpourhaus.com
              </a>
              {" "}with questions.
            </p>
          </div>
        </Container>
      </Section>
    </>
  )
}
