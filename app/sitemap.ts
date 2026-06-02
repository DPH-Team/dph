import type { MetadataRoute } from "next"
import { getPublicEventSlugsWithDates } from "@/lib/db/public"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://districtpourhaus.com"

const STATIC_ROUTES: string[] = [
  "/",
  "/about",
  "/menu",
  "/taps",
  "/events",
  "/gallery",
  "/merch",
  "/careers",
  "/contact",
  "/reservations",
  "/privacy",
  "/terms",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buildTime = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: buildTime,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1.0 : 0.8,
  }))

  const eventRows = await getPublicEventSlugsWithDates()
  const eventEntries: MetadataRoute.Sitemap = eventRows.map((row) => ({
    url: `${BASE_URL}/events/${row.slug}`,
    lastModified: row.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [...staticEntries, ...eventEntries]
}
