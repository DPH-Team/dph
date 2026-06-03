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

type CheckinItemProps = {
  checkin: Checkin
  ariaHidden?: boolean
}

function CheckinItem({ checkin, ariaHidden }: CheckinItemProps) {
  const imgSrc = checkin.beerLabelUrl ?? checkin.userAvatarUrl
  const altText = `${checkin.beerName} by ${checkin.brewery}`

  return (
    <span
      className="inline-flex items-center gap-2.5 px-5 shrink-0"
      aria-hidden={ariaHidden ? "true" : undefined}
    >
      {/* Thumbnail */}
      <span className="relative size-8 rounded-full overflow-hidden bg-card border border-border shrink-0">
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

      {/* Text */}
      <span className="inline-flex items-baseline gap-1 whitespace-nowrap text-sm">
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

      {/* Separator dot */}
      <span className="w-1 h-1 rounded-full bg-border shrink-0" aria-hidden="true" />
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

  return (
    <section
      className="bg-card [padding-block:clamp(1.5rem,4vw,2.5rem)] overflow-hidden"
      aria-label="Recent check-ins ticker"
    >
      {/*
       * Marquee: two copies of the list side-by-side.
       * The first copy is visible content; the second is aria-hidden
       * for screen readers (purely decorative repetition for seamless loop).
       * Pause on hover via group/group-hover.
       */}
      <div
        className="group flex w-max"
        style={{ animation: "ticker-scroll 40s linear infinite" }}
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
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .group:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
