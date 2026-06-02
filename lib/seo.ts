import type { Metadata } from "next"
import type { Location, WeeklyHours, MenuSection, Event } from "@/lib/fixtures/types"

const SITE_NAME = "District Pour Haus"
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://districtpourhaus.com"
const DEFAULT_OG_IMAGE = "/og/default.png"

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

// ─── JSON-LD builder functions ────────────────────────────────────────────────
// Pure data-shaping functions — no JSX. Rendering is done by components/seo/JsonLd.tsx.

const SCHEMA_BASE = "https://schema.org"

const DAY_MAP: Record<keyof WeeklyHours, string> = {
  monday: `${SCHEMA_BASE}/Monday`,
  tuesday: `${SCHEMA_BASE}/Tuesday`,
  wednesday: `${SCHEMA_BASE}/Wednesday`,
  thursday: `${SCHEMA_BASE}/Thursday`,
  friday: `${SCHEMA_BASE}/Friday`,
  saturday: `${SCHEMA_BASE}/Saturday`,
  sunday: `${SCHEMA_BASE}/Sunday`,
}

/**
 * Normalize a Postgres TIME value to the HH:MM format required by schema.org.
 * Postgres drivers may return "HH:MM:SS"; slicing to 5 chars is safe for both
 * "HH:MM:SS" and already-correct "HH:MM". Returns "" for empty/falsy input.
 */
function toSchemaTime(time: string): string {
  return time ? time.slice(0, 5) : ""
}

export function restaurantJsonLd(
  location: Location,
  hours: WeeklyHours,
): Record<string, unknown> {
  const openingHoursSpecification = (
    Object.entries(hours) as [keyof WeeklyHours, WeeklyHours[keyof WeeklyHours]][]
  )
    .filter(([, day]) => !day.closed && day.open && day.close)
    .map(([key, day]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_MAP[key],
      opens: toSchemaTime(day.open),
      closes: toSchemaTime(day.close),
    }))

  return {
    "@context": SCHEMA_BASE,
    "@type": "Restaurant",
    name: location.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: location.address,
      addressLocality: location.city,
      addressRegion: location.state,
      postalCode: location.zip,
      addressCountry: "US",
    },
    telephone: location.phone,
    geo: {
      "@type": "GeoCoordinates",
      latitude: location.lat,
      longitude: location.lng,
    },
    url: BASE_URL,
    image: `${BASE_URL}${DEFAULT_OG_IMAGE}`,
    servesCuisine: ["American", "Pub"],
    priceRange: "$$",
    ...(openingHoursSpecification.length > 0 && { openingHoursSpecification }),
  }
}

export function eventJsonLd(
  event: Event,
  canonicalUrl: string,
  imageUrl: string,
  location: Location,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    "@context": SCHEMA_BASE,
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    startDate: event.startsAt,
    ...(event.endsAt && { endDate: event.endsAt }),
    image: imageUrl,
    url: canonicalUrl,
    eventStatus: `${SCHEMA_BASE}/EventScheduled`,
    eventAttendanceMode: `${SCHEMA_BASE}/OfflineEventAttendanceMode`,
    location: {
      "@type": "Place",
      name: location.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: location.address,
        addressLocality: location.city,
        addressRegion: location.state,
        postalCode: location.zip,
        addressCountry: "US",
      },
    },
  }

  if (event.ticketUrl) {
    result.offers = {
      "@type": "Offer",
      url: event.ticketUrl,
    }
  }

  return result
}

export function menuJsonLd(sections: MenuSection[]): Record<string, unknown> {
  return {
    "@context": SCHEMA_BASE,
    "@type": "Menu",
    hasMenuSection: sections.map((section) => ({
      "@type": "MenuSection",
      name: section.name,
      hasMenuItem: section.items.map((item) => ({
        "@type": "MenuItem",
        name: item.name,
        description: item.description || undefined,
        offers: {
          "@type": "Offer",
          price: (item.priceCents / 100).toFixed(2),
          priceCurrency: "USD",
        },
      })),
    })),
  }
}
