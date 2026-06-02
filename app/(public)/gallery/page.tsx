import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import { getPublicGallery } from "@/lib/db/public"
import { PageHero } from "@/components/marketing/PageHero"
import { GalleryGrid } from "@/components/marketing/GalleryGrid"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"

export const metadata: Metadata = pageMetadata({
  title: "Gallery",
  description: "Inside the Haus — taproom, kitchen, events.",
  path: "/gallery",
})

export default async function GalleryPage() {
  const images = await getPublicGallery()

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
