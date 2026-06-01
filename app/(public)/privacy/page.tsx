import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { pageMetadata } from "@/lib/seo"
import { getLegalDoc } from "@/app/__fixtures__/legal"
import { LegalPage, LegalBody } from "@/components/marketing/LegalPage"

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy — District Pour Haus",
  description: "Privacy policy for District Pour Haus.",
  path: "/privacy",
})

export default async function PrivacyPage() {
  const doc = await getLegalDoc("privacy")
  if (!doc) notFound()

  return (
    <LegalPage title={doc.title} updatedAt={doc.updatedAt}>
      <LegalBody paragraphs={doc.paragraphs} />
    </LegalPage>
  )
}
