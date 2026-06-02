import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, ExternalLink, Share2, Clock, CalendarDays } from "lucide-react"
import { pageMetadata, eventJsonLd } from "@/lib/seo"
import { BLUR_CHARCOAL } from "@/lib/blur"
import type { Location } from "@/lib/fixtures/types"
import {
  getPublicEventBySlug,
  getPublicEventSlugs,
  getPublicUpcomingEvents,
} from "@/lib/db/public"
import { getLocation } from "@/app/__fixtures__/location"
import { JsonLd } from "@/components/seo/JsonLd"
import { EventCard } from "@/components/marketing/EventCard"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { SectionHeading } from "@/components/marketing/SectionHeading"

export const dynamicParams = true

type Params = { slug: string }

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getPublicEventSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const event = await getPublicEventBySlug(slug)
  if (!event) return {}

  return pageMetadata({
    title: event.title,
    description: event.description.slice(0, 155),
    path: `/events/${event.slug}`,
    ogImage: event.imageUrl || undefined,
  })
}

function formatDate(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt)
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }
  const dateStr = start.toLocaleDateString("en-US", opts)
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
  if (!endsAt) return `${dateStr} · ${timeStr}`
  const end = new Date(endsAt)
  const endStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  return `${dateStr} · ${timeStr} – ${endStr}`
}

function isPast(startsAt: string): boolean {
  return new Date(startsAt) < new Date()
}

function buildCalendarLinks(
  title: string,
  startsAt: string,
  endsAt: string | null,
  loc: Pick<Location, "address" | "city" | "state" | "zip">,
) {
  const start = new Date(startsAt)
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")

  const googleUrl = new URL("https://calendar.google.com/calendar/render")
  googleUrl.searchParams.set("action", "TEMPLATE")
  googleUrl.searchParams.set("text", title)
  googleUrl.searchParams.set("dates", `${fmt(start)}/${fmt(end)}`)
  googleUrl.searchParams.set("location", `District Pour Haus, ${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`)

  return { google: googleUrl.toString() }
}

/**
 * Untappd event covers come from imgix-backed utfb-images.untappd.com at 570×320
 * (letterboxed on black). Since the host is imgix, we can request a crisper,
 * larger variant by bumping the w/h query params while preserving everything
 * else (fillcolor, fit, etc.). Falls back to the original on any parse failure.
 */
function upscaleEventImage(url: string): string {
  if (!url) return url
  try {
    const parsed = new URL(url)
    const params = parsed.searchParams
    if (params.has("w")) params.set("w", "1200")
    if (params.has("h")) params.set("h", "675")
    parsed.search = params.toString()
    return parsed.toString()
  } catch {
    return url
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const event = await getPublicEventBySlug(slug)

  if (!event) notFound()

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://districtpourhaus.com"
  const canonicalUrl = `${base}/events/${event.slug}`
  const jsonLdImageUrl = event.imageUrl || `${base}/og/default.png`
  const location = await getLocation()

  const past = isPast(event.startsAt)
  const calLinks = buildCalendarLinks(event.title, event.startsAt, event.endsAt, location)
  const upcomingResult = await getPublicUpcomingEvents()
  const related = upcomingResult.data
    .filter((e) => e.slug !== event.slug)
    .slice(0, 3)

  const hasImage = Boolean(event.imageUrl)
  const hasDescription = event.description.trim().length > 0
  const hasTags = event.tags.length > 0
  const imageSrc = hasImage ? upscaleEventImage(event.imageUrl) : ""
  const shareUrl = `https://districtpourhaus.com/events/${event.slug}`

  return (
    <>
      <JsonLd data={eventJsonLd(event, canonicalUrl, jsonLdImageUrl, location)} />
      {/* ── Compact hero ─────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-border/60 bg-background">
        {/* Restrained copper wash + grain-friendly vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_-10%,oklch(0.648_0.130_47_/_0.16),transparent_55%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[--color-copper]/60 to-transparent"
        />
        <Container className="relative [padding-block:clamp(2rem,5vw,3.5rem)]">
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {event.featured && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[--color-packers-gold] text-[--color-brand-base]">
                  Featured
                </span>
              )}
              {past && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-card text-muted-foreground border border-border">
                  Past event
                </span>
              )}
              <Link
                href="/events"
                className="text-xs font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                ← All events
              </Link>
            </div>

            <h1 className="font-display font-medium text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-[1.08] tracking-[-0.02em] text-foreground">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar size={15} className="text-primary" aria-hidden="true" />
                <time dateTime={event.startsAt}>
                  {formatDate(event.startsAt, event.endsAt)}
                </time>
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={15} className="text-primary" aria-hidden="true" />
                District Pour Haus, Green Bay
              </span>
            </div>
          </div>
        </Container>
      </header>

      {/* ── Image-led body ───────────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <div className="grid lg:grid-cols-[1fr_340px] gap-8 lg:gap-12 items-start">
            {/* Main column — image leads, then optional copy */}
            <div className="flex flex-col gap-8">
              {/* Framed cover */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                {hasImage ? (
                  <div className="relative aspect-[16/9] bg-neutral-950">
                    <Image
                      src={imageSrc}
                      alt={`Event flyer for ${event.title}`}
                      fill
                      priority
                      sizes="(min-width: 1024px) 64rem, 100vw"
                      placeholder="blur"
                      blurDataURL={BLUR_CHARCOAL}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  // Branded placeholder — never a giant empty box
                  <div className="relative aspect-[16/9] flex items-center justify-center bg-[radial-gradient(120%_120%_at_50%_-20%,oklch(0.648_0.130_47_/_0.18),transparent_60%)] bg-neutral-950">
                    <div className="flex flex-col items-center gap-3 text-center px-6">
                      <CalendarDays
                        size={40}
                        className="text-primary/70"
                        aria-hidden="true"
                      />
                      <span className="font-display text-xl text-foreground/90">
                        District Pour Haus
                      </span>
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Our Haus is Your Haus
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional description — rendered only when present */}
              {hasDescription && (
                <div className="prose-custom max-w-2xl">
                  <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Optional tags — rendered only when present */}
              {hasTags && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-card border border-border text-muted-foreground capitalize"
                    >
                      {tag.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky details card */}
            <aside>
              <div className="sticky top-24 flex flex-col gap-5 p-6 rounded-xl bg-card border border-border">
                <div className="flex flex-col gap-3">
                  <h2 className="font-display font-medium text-lg text-foreground">
                    Event details
                  </h2>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <span className="flex items-start gap-2.5">
                      <Calendar size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      <time dateTime={event.startsAt}>
                        {formatDate(event.startsAt, event.endsAt)}
                      </time>
                    </span>
                    <span className="flex items-start gap-2.5">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        District Pour Haus
                        <br />
                        {location.address}, {location.city}, {location.state}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="h-px bg-border" aria-hidden="true" />

                {/* Primary CTA — tickets if available, else reservation; hidden when past */}
                {!past && event.ticketUrl && (
                  <a
                    href={event.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 h-11 px-6 rounded-[var(--radius-md)] bg-primary text-[--color-brand-base] font-medium text-sm hover:bg-[--color-copper-hover] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Get tickets
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}

                {!past && !event.ticketUrl && (
                  <Link
                    href="/reservations"
                    className="flex items-center justify-center gap-2 h-11 px-6 rounded-[var(--radius-md)] bg-primary text-[--color-brand-base] font-medium text-sm hover:bg-[--color-copper-hover] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Make a reservation
                  </Link>
                )}

                {past && (
                  <p className="text-sm text-muted-foreground">
                    This event has already taken place.{" "}
                    <Link
                      href="/events"
                      className="text-primary hover:text-[--color-copper-hover] underline underline-offset-4 transition-colors"
                    >
                      See upcoming events
                    </Link>
                    .
                  </p>
                )}

                {/* Add to calendar */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Add to calendar
                  </h3>
                  <a
                    href={calLinks.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:text-[--color-copper-hover] transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    <Clock size={13} aria-hidden="true" />
                    Google Calendar
                  </a>
                </div>

                {/* Share row */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Share
                  </h3>
                  <div className="flex items-center gap-3">
                    <Share2
                      size={14}
                      className="text-muted-foreground"
                      aria-hidden="true"
                    />
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      aria-label="Share on X (Twitter)"
                    >
                      X / Twitter
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      aria-label="Share on Facebook"
                    >
                      Facebook
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      {/* ── Related events ───────────────────────────────────────────── */}
      {related.length > 0 && (
        <Section padding="md" bg="card">
          <Container>
            <SectionHeading eyebrow="Up next">More events</SectionHeading>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </Container>
        </Section>
      )}
    </>
  )
}
