"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { EventCard } from "@/components/marketing/EventCard"
import type { Event } from "@/lib/fixtures/types"

type ViewMode = "card" | "list"

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
        <div className="mt-4 flex flex-col gap-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} variant="compact" />
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
  const [view, setView] = useState<ViewMode>("card")
  const [selectedMonth, setSelectedMonth] = useState<string>("")

  const monthOptions = getMonthOptions(upcoming)

  const filteredUpcoming = upcoming.filter((e) => {
    return selectedMonth === "" || getMonthKey(e.startsAt) === selectedMonth
  })

  const featured = filteredUpcoming.filter((e) => e.featured)
  const nonFeatured = filteredUpcoming.filter((e) => !e.featured)
  const sortedUpcoming = [...featured, ...nonFeatured]

  return (
    <div className="flex flex-col gap-6">
      {/* Filter + view toggle row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {/* View toggle pill */}
        <div
          role="group"
          aria-label="View mode"
          className="inline-flex rounded-full border border-border bg-input p-1 gap-0.5"
        >
          {(["card", "list"] as const).map((mode) => (
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
      {view === "card" ? (
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
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedUpcoming.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No upcoming events match your filters.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedUpcoming.map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))}
            </div>
          )}

          <PastEventsAccordion events={past} />
        </div>
      )}
    </div>
  )
}
