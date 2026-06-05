"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import type { Checkin } from "@/lib/fixtures/types"
import { Container } from "@/components/marketing/layout/Container"
import { VENUE_TZ } from "@/lib/datetime"

export type CheckinsTickerProps = {
  initial: Checkin[]
}

const POLL_MS = 5 * 60 * 1000 // 5 minutes

const KICKER_PHRASES = [
  "What the Haus is sippin'",
  "Fresh off the wall",
  "Live from the taps",
  "Now pouring",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateComment(s: string, max = 80): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s
}

function formatCheckinTime(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ""
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Mode of brewery strings; ties broken by recency (first in sorted-desc array wins). */
function topBrewery(checkins: Checkin[]): string | null {
  if (checkins.length === 0) return null
  const counts = new Map<string, number>()
  for (const c of checkins) {
    counts.set(c.brewery, (counts.get(c.brewery) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  // checkins are already sorted newest-first; iterating preserves recency tie-break
  for (const c of checkins) {
    const n = counts.get(c.brewery) ?? 0
    if (n > bestCount) {
      bestCount = n
      best = c.brewery
    }
  }
  return best
}

function avgRating(checkins: Checkin[]): number | null {
  const rated = checkins.filter((c) => c.rating !== null)
  if (rated.length === 0) return null
  const sum = rated.reduce((acc, c) => acc + (c.rating as number), 0)
  return sum / rated.length
}

// ─── BeerGlyph variants ───────────────────────────────────────────────────────

/** Large placeholder shown when a checkin card has no image. */
function BeerGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7 text-muted-foreground"
      aria-hidden="true"
    >
      <path d="M5 3h14l-1.5 13.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5L5 3Z" />
      <path d="M5 7h14" />
      <path d="M17 7c0-1 1-2 2-2s2 1 2 2v3" />
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated copper pulse dot. Under reduced motion: static dot, no ring. */
function PulseDot({ reduced }: { reduced: boolean }) {
  return (
    <span className="relative inline-flex size-2 shrink-0 mr-1.5" aria-hidden="true">
      {!reduced && (
        <span
          className="absolute inset-0 rounded-full bg-primary opacity-75"
          style={{ animation: "ping-ring 1.4s cubic-bezier(0,0,0.2,1) infinite" }}
        />
      )}
      <span className="relative rounded-full size-2 bg-primary block" />
    </span>
  )
}

/**
 * Cycles through KICKER_PHRASES every ~6.5 s with a cross-fade.
 * Under reduced motion: renders the first phrase only, static.
 */
function RotatingKicker({ reduced }: { reduced: boolean }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => {
      setIdx((prev) => (prev + 1) % KICKER_PHRASES.length)
    }, 6500)
    return () => clearInterval(id)
  }, [reduced])

  const phrase = reduced ? KICKER_PHRASES[0] : KICKER_PHRASES[idx]

  return (
    <span className="relative inline-block">
      {reduced ? (
        <span className="uppercase tracking-wide text-[11px] font-medium text-primary">
          {phrase}
        </span>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="uppercase tracking-wide text-[11px] font-medium text-primary inline-block"
          >
            {KICKER_PHRASES[idx]}
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  )
}

/**
 * Derived tap-room stats line.
 * Computes: top brewery, avg rating, today/tonight from venue-local hour.
 * All clauses are optional; never renders a dangling separator.
 */
function TapRoomStatLine({
  checkins,
  reduced,
}: {
  checkins: Checkin[]
  reduced: boolean
}) {
  const stats = useMemo(() => {
    const top = topBrewery(checkins)
    const avg = avgRating(checkins)

    // Determine "today" vs "tonight" from venue-local hour
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: VENUE_TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
    const venueHour = parseInt(hourStr, 10)
    const timeWord = venueHour < 17 ? "today" : "tonight"

    return { top, avg, timeWord }
  }, [checkins])

  const clauses: React.ReactNode[] = []

  if (stats.top) {
    clauses.push(
      <span key="brewery" className="text-muted-foreground">
        Everyone&rsquo;s loving{" "}
        <span className="text-foreground font-medium">{stats.top}</span>{" "}
        {stats.timeWord}
      </span>,
    )
  }

  if (stats.avg !== null) {
    clauses.push(
      <span key="rating" className="text-muted-foreground">
        <span className="text-primary font-medium tabular-nums">
          {stats.avg.toFixed(1)}★
        </span>{" "}
        on average
      </span>,
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 mb-4 px-4">
      {/* Live kicker tag — own line */}
      <span className="flex items-center">
        <PulseDot reduced={reduced} />
        <RotatingKicker reduced={reduced} />
      </span>

      {/* Stat clauses — second line, centered */}
      <div className="flex items-center justify-center flex-wrap text-xs">
        {clauses.map((clause, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && (
              <span className="mx-1.5 text-muted-foreground/40 select-none" aria-hidden="true">
                ·
              </span>
            )}
            {clause}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── CheckinItem ──────────────────────────────────────────────────────────────

type CheckinItemProps = {
  checkin: Checkin
  ariaHidden?: boolean
  isFresh?: boolean
  reduced?: boolean
}

function CheckinItem({ checkin, ariaHidden, isFresh, reduced }: CheckinItemProps) {
  const imgSrc = checkin.beerLabelUrl ?? checkin.userAvatarUrl
  const altText = `${checkin.beerName} by ${checkin.brewery}`
  const hasComment = typeof checkin.comment === "string" && checkin.comment.length > 0

  const inner = (
    <span
      className="inline-flex items-start gap-2.5 px-5 shrink-0 whitespace-nowrap"
      aria-hidden={ariaHidden ? "true" : undefined}
    >
      {/* Thumbnail — aligned to top of the text block */}
      <span className="relative size-8 rounded-full overflow-hidden bg-card border border-border shrink-0 mt-0.5">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={altText}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <BeerGlyph />
        )}
      </span>

      {/* Text column: timestamp row + name/beer row + optional comment row */}
      <span className="inline-flex flex-col gap-0.5">
        {/* Timestamp row */}
        {formatCheckinTime(checkin.createdAt) !== "" && (
          <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wide tabular-nums whitespace-nowrap">
            <time dateTime={checkin.createdAt}>{formatCheckinTime(checkin.createdAt)}</time>
          </span>
        )}

        {/* Primary row */}
        <span className="inline-flex items-baseline gap-1 text-sm">
          <span className="font-medium text-foreground">{checkin.userFirstName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground">{checkin.beerName}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">{checkin.brewery}</span>
          {checkin.rating !== null && (
            <>
              <span className="text-muted-foreground ml-1" aria-hidden="true">·</span>
              <span className="text-primary font-medium tabular-nums" aria-label={`Rated ${checkin.rating.toFixed(1)} out of 5`}>{checkin.rating.toFixed(1)}★</span>
            </>
          )}
        </span>

        {/* Comment row — only rendered when a non-empty comment exists */}
        {hasComment && (
          <span className="text-xs text-muted-foreground italic leading-tight">
            &ldquo;{truncateComment(checkin.comment!)}&rdquo;
          </span>
        )}
      </span>

      {/* Separator dot */}
      <span className="w-1 h-1 rounded-full bg-border shrink-0 mt-2" aria-hidden="true" />
    </span>
  )

  // Fresh-pour flash: copper glow entrance animation
  // Under reduced motion: static faint background tint (no animation, no layout shift)
  if (isFresh) {
    if (reduced) {
      return (
        <span
          className="inline-flex"
          style={{
            background: "color-mix(in oklch, var(--primary) 8%, transparent)",
            borderRadius: "0.375rem",
          }}
        >
          {inner}
        </span>
      )
    }
    return (
      <motion.span
        className="inline-flex"
        initial={{ opacity: 0, scale: 0.96, filter: "brightness(1.6) drop-shadow(0 0 6px var(--primary))" }}
        animate={{ opacity: 1, scale: 1, filter: "brightness(1) drop-shadow(0 0 0px transparent)" }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ borderRadius: "0.375rem" }}
      >
        {inner}
      </motion.span>
    )
  }

  return <>{inner}</>
}

// ─── Mask style helpers ───────────────────────────────────────────────────────

/**
 * Horizontal fade-mask applied to the marquee/scroll wrapper.
 * Uses alpha-based mask-image so it works on any background color.
 * Mobile: tighter 6% fade so short cards aren't swallowed.
 * Desktop: 8% fade.
 */
const MASK_STYLE: React.CSSProperties = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
}

const MASK_STYLE_REDUCED: React.CSSProperties = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)",
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function CheckinsTicker({ initial }: CheckinsTickerProps) {
  const reduced = useReducedMotion() ?? false
  const [checkins, setCheckins] = useState<Checkin[]>(initial)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track the newest createdAt timestamp seen so far (for fresh-pour detection).
  // Initialised to the newest in the initial list so initial mount never flashes.
  const newestSeenRef = useRef<number>(
    (() => {
      let max = -Infinity
      for (const c of initial) {
        const t = new Date(c.createdAt).getTime()
        if (!isNaN(t) && t > max) max = t
      }
      return max === -Infinity ? 0 : max
    })(),
  )

  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set())

  const sortedCheckins = useMemo(
    () =>
      [...checkins].sort((a, b) => {
        const ta = new Date(a.createdAt).getTime()
        const tb = new Date(b.createdAt).getTime()
        const validA = isNaN(ta) ? -Infinity : ta
        const validB = isNaN(tb) ? -Infinity : tb
        return validB - validA
      }),
    [checkins],
  )

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/checkins")
        if (!res.ok) return
        const json = (await res.json()) as { checkins: Checkin[]; stale: boolean }
        if (!Array.isArray(json.checkins) || json.checkins.length === 0) return

        const prevNewest = newestSeenRef.current
        const incoming = json.checkins

        // Identify truly new arrivals
        const newIds = new Set<string>()
        let nextNewest = prevNewest
        for (const c of incoming) {
          const t = new Date(c.createdAt).getTime()
          if (!isNaN(t)) {
            if (t > prevNewest) newIds.add(c.id)
            if (t > nextNewest) nextNewest = t
          }
        }

        newestSeenRef.current = nextNewest
        setCheckins(incoming)

        if (newIds.size > 0) {
          setFreshIds(newIds)
          // Clear fresh flags after the entrance animation completes
          setTimeout(() => setFreshIds(new Set()), 2200)
        }
      } catch {
        // keep last-good data — ignore fetch errors silently
      }
    }

    intervalRef.current = setInterval(poll, POLL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (checkins.length === 0) {
    return (
      <section
        className="bg-card [padding-block:clamp(1.5rem,4vw,2.5rem)]"
        aria-label="Recent check-ins"
      >
        <Container>
          <p className="text-sm text-muted-foreground text-center">
            Quiet at the bar right now — first round&rsquo;s on whoever shows up.
          </p>
        </Container>
      </section>
    )
  }

  // ── Reduced-motion fallback: scrollable list ────────────────────────────────
  if (reduced) {
    return (
      <section
        className="bg-card [padding-block:clamp(0.5rem,1.5vw,0.875rem)] overflow-hidden"
        aria-label="Recent check-ins — scrollable list"
      >
        <Container>
          <TapRoomStatLine checkins={sortedCheckins} reduced={reduced} />
        </Container>

        {/* Scrollable row with edge fades */}
        <div className="relative overflow-hidden">
          <div
            className="overflow-x-auto scrollbar-none"
            role="region"
            aria-label="Recent check-ins"
            style={MASK_STYLE_REDUCED}
          >
            <div className="flex w-max">
              {sortedCheckins.map((c) => (
                <CheckinItem
                  key={c.id}
                  checkin={c}
                  isFresh={freshIds.has(c.id)}
                  reduced={reduced}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── Animated marquee ────────────────────────────────────────────────────────
  const duration = Math.max(60, sortedCheckins.length * 10)

  return (
    <section
      className="bg-card [padding-block:clamp(0.5rem,1.5vw,0.875rem)] overflow-hidden"
      aria-label="Recent check-ins ticker"
    >
      <Container>
        <TapRoomStatLine checkins={sortedCheckins} reduced={reduced} />
      </Container>

      {/*
       * Mask wrapper: dissolves cards into bg-card at both edges.
       * overflow-hidden prevents the mask from showing bleed outside
       * the section. The mask is applied here (not on the scrolling
       * track itself) so it stays fixed while content scrolls under it.
       */}
      <div className="relative overflow-hidden" style={MASK_STYLE}>
        {/*
         * Marquee: two copies of the list side-by-side.
         * The first copy is visible content; the second is aria-hidden
         * for screen readers (purely decorative repetition for seamless loop).
         * Pause on hover via .ticker-track:hover in the style block below.
         * The duration CSS variable is set inline so the hover rule
         * (which only touches animation-play-state) is never overridden.
         */}
        <div
          className="ticker-track flex w-max"
          style={{ "--ticker-duration": `${duration}s` } as React.CSSProperties}
        >
          {/* Primary — visible to screen readers */}
          <div className="flex">
            {sortedCheckins.map((c) => (
              <CheckinItem
                key={c.id}
                checkin={c}
                isFresh={freshIds.has(c.id)}
                reduced={reduced}
              />
            ))}
          </div>

          {/* Duplicate — aria-hidden; makes the loop seamless */}
          <div className="flex" aria-hidden="true">
            {sortedCheckins.map((c) => (
              <CheckinItem
                key={`dup-${c.id}`}
                checkin={c}
                ariaHidden
                isFresh={freshIds.has(c.id)}
                reduced={reduced}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .ticker-track {
          animation: ticker-scroll var(--ticker-duration, 80s) linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ping-ring {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  )
}
