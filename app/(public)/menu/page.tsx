import type { Metadata } from "next"
import Link from "next/link"
import { pageMetadata } from "@/lib/seo"
import { getPublicMenu } from "@/lib/db/public"
import { PageHero } from "@/components/marketing/PageHero"
import { MenuSectionTabs } from "@/components/marketing/MenuSectionTabs"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"

export const metadata: Metadata = pageMetadata({
  title: "Menu — District Pour Haus",
  description: "Scratch kitchen menu — shareables, mains, sides, desserts. Pairs with whatever you pour.",
  path: "/menu",
})

export default async function MenuPage() {
  const sections = await getPublicMenu()

  return (
    <>
      <PageHero
        eyebrow="Food"
        title="From the Kitchen"
        lead="Scratch-made, honest food. Drinks are on the Taps page."
      >
        <div className="mt-2">
          <Link
            href="/taps"
            className="text-sm font-medium text-primary hover:text-[--color-copper-hover] transition-colors underline underline-offset-4"
          >
            See what&apos;s pouring on tap →
          </Link>
        </div>
      </PageHero>

      <Section padding="md" className="bg-background">
        <Container>
          <MenuSectionTabs sections={sections} />
        </Container>
      </Section>
    </>
  )
}
