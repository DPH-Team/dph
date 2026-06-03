import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import { fetchProducts } from "@/lib/printify"
import { PRINTIFY_STORE_URL } from "@/lib/fixtures/merch"
import { PageHero } from "@/components/marketing/PageHero"
import { MerchBrowser } from "@/components/marketing/MerchBrowser"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
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
