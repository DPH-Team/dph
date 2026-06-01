import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Calendar, MapPin, ExternalLink, Share2, Clock } from "lucide-react"
import { pageMetadata } from "@/lib/seo"
import {
  getPublicEventBySlug,
  getPublicEventSlugs,
  getPublicUpcomingEvents,
} from "@/lib/db/public"
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
    title: `${event.title} — District Pour Haus`,
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

function buildCalendarLinks(title: string, startsAt: string, endsAt: string | null) {
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
  googleUrl.searchParams.set("location", "District Pour Haus, 123 Main Street, Green Bay, WI 54301")

  return { google: googleUrl.toString() }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const event = await getPublicEventBySlug(slug)

  if (!event) notFound()

  const past = isPast(event.startsAt)
  const calLinks = buildCalendarLinks(event.title, event.startsAt, event.endsAt)
  const upcomingResult = await getPublicUpcomingEvents()
  const related = upcomingResult.data
    .filter((e) => e.slug !== event.slug)
    .slice(0, 3)

  const hasImage = Boolean(event.imageUrl)

  return (
    <>
      {/* Event hero */}
      <div className="relative w-full aspect-[16/7] min-h-[300px] bg-neutral-900 overflow-hidden">
        {hasImage ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Hero content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="mx-auto max-w-[80rem]">
            <div className="flex flex-wrap gap-2 mb-4">
              {event.featured && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[--color-packers-gold] text-[--color-brand-base]">
                  Featured
                </span>
              )}
              {past && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-black/60 text-[--color-cream]/70 border border-white/10">
                  Past event
                </span>
              )}
            </div>
            <h1 className="font-display font-medium text-[clamp(2rem,1.5rem+3vw,4rem)] leading-[1.1] tracking-[-0.02em] text-white mb-3 max-w-3xl">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} aria-hidden="true" />
                <time dateTime={event.startsAt}>
                  {formatDate(event.startsAt, event.endsAt)}
                </time>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" />
                District Pour Haus
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <Section padding="md">
        <Container>
          <div className="grid lg:grid-cols-[1fr_320px] gap-10">
            {/* Long description */}
            <div className="flex flex-col gap-6">
              <div className="prose-custom">
                <p className="text-base text-muted-foreground leading-relaxed text-lg">
                  {event.description}
                </p>
              </div>

              {event.tags.length > 0 && (
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

            {/* Sticky sidebar */}
            <aside className="flex flex-col gap-4">
              <div className="sticky top-24 flex flex-col gap-4 p-5 rounded-xl bg-card border border-border">
                <div className="flex flex-col gap-2">
                  <h2 className="font-display font-medium text-lg text-foreground">
                    Event details
                  </h2>
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                    <span className="flex items-start gap-2">
                      <Calendar size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <time dateTime={event.startsAt}>
                        {formatDate(event.startsAt, event.endsAt)}
                      </time>
                    </span>
                    <span className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>
                        District Pour Haus
                        <br />
                        123 Main Street, Green Bay, WI
                      </span>
                    </span>
                  </div>
                </div>

                {/* Ticket CTA — hidden for past events */}
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

                {/* Add to calendar */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Add to calendar
                  </h3>
                  <a
                    href={calLinks.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:text-[--color-copper-hover] transition-colors w-fit"
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
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(`https://districtpourhaus.com/events/${event.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Share on X (Twitter)"
                    >
                      X / Twitter
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://districtpourhaus.com/events/${event.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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

      {/* Related events */}
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
