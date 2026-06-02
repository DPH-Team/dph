import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://districtpourhaus.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/api"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
