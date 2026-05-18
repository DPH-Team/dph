import type { Metadata } from "next"

const SITE_NAME = "District Pour Haus"
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://districtpourhaus.com"
// TODO: Replace with /og/default.png once design team exports PNG. Currently using SVG placeholder.
const DEFAULT_OG_IMAGE = "/og/default.svg"

export function pageMetadata({
  title,
  description,
  path,
  ogImage,
}: {
  title: string
  description: string
  path: string
  ogImage?: string
}): Metadata {
  const truncatedDesc =
    description.length > 160 ? description.slice(0, 157) + "…" : description

  const url = `${BASE_URL}${path}`
  const image = ogImage ?? DEFAULT_OG_IMAGE
  const absoluteImage = image.startsWith("http") ? image : `${BASE_URL}${image}`

  return {
    title,
    description: truncatedDesc,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url,
      title,
      description: truncatedDesc,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: truncatedDesc,
      images: [absoluteImage],
    },
  }
}
