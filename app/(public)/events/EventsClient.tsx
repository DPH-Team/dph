"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { EventCard } from "@/components/marketing/EventCard"
import type { Event } from "@/lib/fixtures/types"

const TAG_FILTERS = [
  { value: "live-music", label: "Live Music" },
  { value: "trivia", label: "Trivia" },
  { value: "game-day", label: "Game Day" },
  { value: "private", label: "Private" },
] as const

type TagFilter = (typeof TAG_FILTERS)[number]["value"]

type ViewMode = "list" | "calendar"

function getMonthOptions(events: Event[]): { value: string; label: string }[] {
  const months = new Set<string>()
  events.forEach((e) => {
    const d = new Date(e.startsAt)
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  })
  return Array.from(months)
    .sort()
    .map((m) => {
      const [year, month] = m.split("-")
      const d = new Date(parseInt(year ?? "2026"), parseInt(month ?? "1") - 1, 1)
      return {
        value: m,
        label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      }
    })
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function CalendarView({ events }: { events: Event[] }) {
  const [month, setMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const [year, monthNum] = month.split("-").map(Number) as [number, number]
  const daysInMonth = getDaysInMonth(year, monthNum - 1)
  const firstDow = getFirstDayOfWeek(year, monthNum - 1)

  const eventsByDay = (() => {
    const map = new Map<number, Event[]>()
    events.forEach((e) => {
      const d = new Date(e.startsAt)
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (mk === month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(e)
      }
    })
    return map
  })()

  const handlePrev = () => {
    const [y, m] = month.split("-").map(Number) as [number, number]
    const d = new Date(y, m - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const handleNext = () => {
    const [y, m] = month.split("-").map(Number) as [number, number]
    const d = new Date(y, m, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          className={cn(
            "flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1",
          )}
          aria-label="Previous month"
        >
          ← Prev
        </button>
        <h2 className="font-medium text-foreground">{monthLabel}</h2>
        <button
          onClick={handleNext}
          className={cn(
            "flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1",
          )}
          aria-label="Next month"
        >
          Next →
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1" role="row">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-1"
            role="columnheader"
            aria-label={d}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Events calendar for ${monthLabel}`}
      >
        {/* Empty cells for days before the 1st */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} role="gridcell" aria-hidden="true" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayEvents = eventsByDay.get(day) ?? []
          const hasEvents = dayEvents.length > 0
          const today = new Date()
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() + 1 === monthNum &&
            today.getDate() === day

          return (
            <div
              key={day}
              role="gridcell"
              aria-label={
                hasEvents
                  ? `${day} ${monthLabel} — ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}`
                  : `${day} ${monthLabel}`
              }
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center rounded-lg border transition-colors text-sm",
                isToday
                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                  : "border-transparent hover:border-border text-muted-foreground",
                hasEvents && "cursor-default",
              )}
            >
              <span>{day}</span>
              {hasEvents && (
                <span
                  className="absolute bottom-1 size-1.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Events with dots legend */}
      {eventsByDay.size > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This month
          </h3>
          <div className="flex flex-col gap-2">
            {Array.from(eventsByDay.entries())
              .sort(([a], [b]) => a - b)
              .flatMap(([, evts]) =>
                evts.map((e) => <EventCard key={e.id} event={e} variant="compact" />),
              )}
          </div>
        </div>
      )}
    </div>
  )
}

function PastEventsAccordion({ events }: { events: Event[] }) {
  const [open, setOpen] = useState(false)

  if (events.length === 0) return null

  return (
    <div className="border-t border-border pt-6 mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex items-center justify-between w-full text-left gap-4",
          "text-base font-medium text-foreground hover:text-primary transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
        )}
      >
        <span>Archive ({events.length})</span>
        {open ? (
          <ChevronUp size={16} className="shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

export type EventsClientProps = {
  upcoming: Event[]
  past: Event[]
}

export function EventsClient({ upcoming, past }: EventsClientProps) {
  const [view, setView] = useState<ViewMode>("list")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [activeTags, setActiveTags] = useState<TagFilter[]>([])

  const monthOptions = getMonthOptions(upcoming)

  const filteredUpcoming = upcoming.filter((e) => {
    const matchesMonth =
      selectedMonth === "" || getMonthKey(e.startsAt) === selectedMonth
    const matchesTags =
      activeTags.length === 0 ||
      activeTags.some((tag) => e.tags.includes(tag))
    return matchesMonth && matchesTags
  })

  const featured = filteredUpcoming.filter((e) => e.featured)
  const nonFeatured = filteredUpcoming.filter((e) => !e.featured)
  const sortedUpcoming = [...featured, ...nonFeatured]

  const toggleTag = (tag: TagFilter) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month select */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Filter by month"
            className={cn(
              "h-9 px-3 pr-8 rounded-full border border-border bg-input text-sm text-foreground appearance-none",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
            )}
          >
            <option value="">All months</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Tag chips */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by event type">
          {TAG_FILTERS.map((tag) => {
            const isActive = activeTags.includes(tag.value)
            const isGameDay = tag.value === "game-day"
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                aria-pressed={isActive}
                className={cn(
                  "h-8 px-3 rounded-full text-sm font-medium transition-colors border",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && isGameDay
                    ? "bg-packers-green border-packers-green text-cream"
                    : isActive
                      ? "bg-primary border-primary text-brand-base"
                      : "bg-transparent border-border text-muted-foreground hover:border-[oklch(0.400_0.006_80)] hover:text-foreground",
                )}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* View toggle — pill at top */}
      <div className="flex items-center justify-end">
        <div
          role="group"
          aria-label="View mode"
          className="inline-flex rounded-full border border-border bg-input p-1 gap-0.5"
        >
          {(["list", "calendar"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              className={cn(
                "h-7 px-4 rounded-full text-sm font-medium transition-colors capitalize",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === mode
                  ? "bg-primary text-brand-base"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      {view === "list" ? (
        <div className="flex flex-col gap-6">
          {sortedUpcoming.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No upcoming events match your filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedUpcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          <PastEventsAccordion events={past} />
        </div>
      ) : (
        <CalendarView events={[...upcoming, ...past]} />
      )}
    </div>
  )
}
