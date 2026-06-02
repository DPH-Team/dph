import Link from "next/link"
import Image from "next/image"
import { Calendar, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { BLUR_CHARCOAL } from "@/lib/blur"
import type { Event } from "@/lib/fixtures/types"

export type EventCardProps = {
  event: Event
  variant?: "default" | "featured" | "compact"
  className?: string
}

function formatEventDate(startsAt: string): string {
  const start = new Date(startsAt)
  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${dateStr} · ${timeStr}`
}

function isPastEvent(startsAt: string): boolean {
  return new Date(startsAt) < new Date()
}

export function EventCard({ event, variant = "default", className }: EventCardProps) {
  const past = isPastEvent(event.startsAt)

  if (variant === "compact") {
    return (
      <Link
        href={`/events/${event.slug}`}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg hover:bg-card transition-colors group",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {event.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatEventDate(event.startsAt)}
          </span>
        </div>
        {event.featured && (
          <span className="shrink-0 text-xs font-semibold text-[--color-packers-gold] px-2 py-0.5 rounded-full border border-[--color-packers-gold]/30">
            Featured
          </span>
        )}
      </Link>
    )
  }

  if (variant === "featured") {
    return (
      <article
        className={cn(
          "relative overflow-hidden rounded-xl bg-card border border-border group",
          className
        )}
      >
        <div className="aspect-[16/9] bg-neutral-900 relative overflow-hidden">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={BLUR_CHARCOAL}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute top-3 left-3 flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-[--color-packers-gold] text-[--color-brand-base]">
              Featured
            </span>
          </div>

          {past && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-black/60 text-[--color-cream]/70">
                Past event
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-3">
          <h3 className="font-display font-medium text-xl leading-tight text-foreground">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar size={14} aria-hidden="true" />
            <time dateTime={event.startsAt}>{formatEventDate(event.startsAt)}</time>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
          <div className="flex items-center justify-between mt-1">
            <Link
              href={`/events/${event.slug}`}
              className="text-sm font-medium text-primary hover:text-[--color-copper-hover] transition-colors underline underline-offset-4"
            >
              View details →
            </Link>
            {!past && event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Get tickets ↗
              </a>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl bg-card border border-border group hover:border-border/80 transition-colors",
        className
      )}
    >
      <div className="aspect-[16/9] bg-neutral-900 relative overflow-hidden">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL={BLUR_CHARCOAL}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {event.featured && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-[--color-packers-gold] text-[--color-brand-base]">
              Featured
            </span>
          )}
          {past && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-black/60 text-[--color-cream]/70">
              Past event
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-display font-medium text-lg leading-tight text-foreground group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar size={12} aria-hidden="true" />
          <time dateTime={event.startsAt}>{formatEventDate(event.startsAt)}</time>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        {event.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <Tag size={11} className="text-muted-foreground/60" aria-hidden="true" />
            {event.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-muted-foreground/70 capitalize">
                {tag.replace("-", " ")}
              </span>
            ))}
          </div>
        )}
        <Link
          href={`/events/${event.slug}`}
          className="text-sm font-medium text-primary hover:text-[--color-copper-hover] transition-colors mt-1 w-fit"
          aria-label={`View details for ${event.title}`}
        >
          Details →
        </Link>
      </div>
    </article>
  )
}
