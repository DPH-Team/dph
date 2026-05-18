import { cn } from "@/lib/utils"
import type { WeeklyHours, HoursOverride, DayOfWeek } from "@/lib/fixtures/types"

export type OpenStatusPillProps = {
  hours: WeeklyHours
  overrides: HoursOverride[]
  className?: string
}

function parseTime(timeStr: string): number {
  const [hStr, mStr] = timeStr.split(":")
  const h = parseInt(hStr ?? "0", 10)
  const m = parseInt(mStr ?? "0", 10)
  return h * 60 + m
}

function formatTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":")
  const h = parseInt(hStr ?? "0", 10)
  const m = parseInt(mStr ?? "0", 10)
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayH} ${period}` : `${displayH}:${String(m).padStart(2, "0")} ${period}`
}

const DAY_NAMES: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

type OpenStatus = {
  isOpen: boolean
  closesAt: string | null
  opensAt: string | null
}

export function computeOpenStatus(
  hours: WeeklyHours,
  overrides: HoursOverride[],
  now: Date = new Date()
): OpenStatus {
  const todayIso = now.toISOString().slice(0, 10)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const override = overrides.find((o) => o.date === todayIso)
  if (override) {
    if (override.closed || !override.open || !override.close) {
      return { isOpen: false, closesAt: null, opensAt: null }
    }
    const openMin = parseTime(override.open)
    const closeMin = parseTime(override.close) === 0 ? 24 * 60 : parseTime(override.close)
    const isOpen = currentMinutes >= openMin && currentMinutes < closeMin
    return {
      isOpen,
      closesAt: isOpen ? formatTime(override.close) : null,
      opensAt: !isOpen ? formatTime(override.open) : null,
    }
  }

  const dayName = DAY_NAMES[now.getDay()]
  if (!dayName) return { isOpen: false, closesAt: null, opensAt: null }

  const dayHours = hours[dayName]
  if (dayHours.closed) return { isOpen: false, closesAt: null, opensAt: null }

  const openMin = parseTime(dayHours.open)
  const closeMin = parseTime(dayHours.close) === 0 ? 24 * 60 : parseTime(dayHours.close)
  const isOpen = currentMinutes >= openMin && currentMinutes < closeMin

  return {
    isOpen,
    closesAt: isOpen ? formatTime(dayHours.close) : null,
    opensAt: !isOpen ? formatTime(dayHours.open) : null,
  }
}

export function OpenStatusPill({
  hours,
  overrides,
  className,
}: OpenStatusPillProps) {
  const status = computeOpenStatus(hours, overrides)

  if (!status.isOpen) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        "bg-[--color-packers-green] text-[--color-cream]",
        className
      )}
      aria-label={`Open now, closes at ${status.closesAt ?? "midnight"}`}
    >
      <span
        className="size-1.5 rounded-full bg-[--color-cream] shrink-0"
        aria-hidden="true"
      />
      {status.closesAt ? `Open · Closes ${status.closesAt}` : "Open Now"}
    </span>
  )
}
