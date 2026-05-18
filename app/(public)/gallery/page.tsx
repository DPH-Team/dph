import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import { getGalleryImages } from "@/lib/fixtures"
import { PageHero } from "@/components/marketing/PageHero"
import { GalleryGrid } from "@/components/marketing/GalleryGrid"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"

export const metadata: Metadata = pageMetadata({
  title: "Gallery — District Pour Haus",
  description: "Inside the Haus — taproom, kitchen, events.",
  path: "/gallery",
})

export default async function GalleryPage() {
  const images = await getGalleryImages()

  return (
    <>
      <PageHero
        eyebrow="Inside the haus"
        title="Inside the Haus"
        lead="A look at the taproom, the kitchen, and the people who make it what it is."
      />

      <Section padding="md" className="bg-background">
        <Container size="xl">
          <GalleryGrid images={images} />
        </Container>
      </Section>
    </>
  )
}
