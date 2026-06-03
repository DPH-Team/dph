"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import type { Checkin } from "@/lib/fixtures/types"
import { Container } from "@/components/marketing/layout/Container"

export type CheckinsTickerProps = {
  initial: Checkin[]
}

const POLL_MS = 5 * 60 * 1000 // 5 minutes

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

function truncateComment(s: string, max = 80): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s
}

type CheckinItemProps = {
  checkin: Checkin
  ariaHidden?: boolean
}

function CheckinItem({ checkin, ariaHidden }: CheckinItemProps) {
  const imgSrc = checkin.beerLabelUrl ?? checkin.userAvatarUrl
  const altText = `${checkin.beerName} by ${checkin.brewery}`
  const hasComment = typeof checkin.comment === "string" && checkin.comment.length > 0

  return (
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

      {/* Text column: name/beer row + optional comment row */}
      <span className="inline-flex flex-col gap-0.5">
        {/* Primary row */}
        <span className="inline-flex items-baseline gap-1 text-sm">
          <span className="font-medium text-foreground">{checkin.userFirstName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground">{checkin.beerName}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">{checkin.brewery}</span>
          {checkin.rating !== null && (
            <>
              <span className="text-muted-foreground ml-1">·</span>
              <span className="text-packers-gold font-medium tabular-nums">
                {checkin.rating.toFixed(1)}★
              </span>
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
}

export function CheckinsTicker({ initial }: CheckinsTickerProps) {
  const reduced = useReducedMotion()
  const [checkins, setCheckins] = useState<Checkin[]>(initial)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/checkins")
        if (!res.ok) return
        const json = (await res.json()) as { checkins: Checkin[]; stale: boolean }
        if (Array.isArray(json.checkins) && json.checkins.length > 0) {
          setCheckins(json.checkins)
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

  if (checkins.length === 0) {
    return (
      <section className="bg-card [padding-block:clamp(1.5rem,4vw,2.5rem)]" aria-label="Recent check-ins">
        <Container>
          <p className="text-sm text-muted-foreground text-center">Quiet at the bar right now — check back soon.</p>
        </Container>
      </section>
    )
  }

  if (reduced) {
    return (
      <section
        className="bg-card [padding-block:clamp(1.5rem,4vw,2.5rem)] overflow-hidden"
        aria-label="Recent check-ins — scrollable list"
      >
        <div
          className="overflow-x-auto scrollbar-none"
          role="region"
          aria-label="Recent check-ins"
        >
          <div className="flex w-max py-1">
            {checkins.map((c) => (
              <CheckinItem key={c.id} checkin={c} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const duration = Math.max(60, checkins.length * 10)

  return (
    <section
      className="bg-card [padding-block:clamp(1.5rem,4vw,2.5rem)] overflow-hidden"
      aria-label="Recent check-ins ticker"
    >
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
          {checkins.map((c) => (
            <CheckinItem key={c.id} checkin={c} />
          ))}
        </div>

        {/* Duplicate — aria-hidden; makes the loop seamless */}
        <div className="flex" aria-hidden="true">
          {checkins.map((c) => (
            <CheckinItem key={`dup-${c.id}`} checkin={c} ariaHidden />
          ))}
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
      `}</style>
    </section>
  )
}
