import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { pageMetadata } from "@/lib/seo"
import { getLegalDoc } from "@/app/__fixtures__/legal"
import { LegalPage, LegalBody } from "@/components/marketing/LegalPage"

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "Terms of use for District Pour Haus.",
  path: "/terms",
})

export default async function TermsPage() {
  const doc = await getLegalDoc("terms")
  if (!doc) notFound()

  return (
    <LegalPage title={doc.title} updatedAt={doc.updatedAt}>
      <LegalBody paragraphs={doc.paragraphs} />
    </LegalPage>
  )
}
