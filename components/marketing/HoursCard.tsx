import Link from "next/link"
import { cn } from "@/lib/utils"
import type { WeeklyHours, HoursOverride, DayOfWeek } from "@/lib/fixtures/types"
import { OpenStatusPill, computeOpenStatus } from "./OpenStatusPill"

export type HoursCardProps = {
  hours: WeeklyHours
  overrides: HoursOverride[]
  variant?: "default" | "compact"
  className?: string
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

const DAY_ORDER: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

function formatHourRange(open: string, close: string): string {
  const fmt = (t: string) => {
    const [hStr, mStr] = t.split(":")
    const h = parseInt(hStr ?? "0", 10)
    const m = parseInt(mStr ?? "0", 10)
    const period = h >= 12 && h !== 24 ? "PM" : "AM"
    const displayH = h === 0 || h === 24 ? 12 : h > 12 ? h - 12 : h
    return m === 0 ? `${displayH} ${period}` : `${displayH}:${String(m).padStart(2, "0")} ${period}`
  }
  const closeLabel = close === "00:00" ? "Midnight" : fmt(close)
  return `${fmt(open)} – ${closeLabel}`
}

export function HoursCard({
  hours,
  overrides,
  variant = "default",
  className,
}: HoursCardProps) {
  const status = computeOpenStatus(hours, overrides)
  const todayIndex = new Date().getDay()
  const todayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][todayIndex] as DayOfWeek

  if (variant === "compact") {
    const todayHours = hours[todayName]
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-2">
          <OpenStatusPill hours={hours} overrides={overrides} />
        </div>
        <p className="text-sm text-muted-foreground">
          {todayHours.closed
            ? "Closed today"
            : formatHourRange(todayHours.open, todayHours.close)}
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-medium text-foreground">Hours</h3>
        {status.isOpen && (
          <OpenStatusPill hours={hours} overrides={overrides} />
        )}
      </div>

      <dl className="flex flex-col gap-1.5">
        {DAY_ORDER.map((day) => {
          const dayHours = hours[day]
          const isToday = day === todayName
          return (
            <div
              key={day}
              className={cn(
                "flex justify-between items-center text-sm gap-4",
                isToday && "font-medium text-foreground",
                !isToday && "text-muted-foreground"
              )}
            >
              <dt className="min-w-[2.5rem]">{DAY_LABELS[day]}</dt>
              <dd className="tabular-nums">
                {dayHours.closed
                  ? "Closed"
                  : formatHourRange(dayHours.open, dayHours.close)}
              </dd>
            </div>
          )
        })}
      </dl>

      <Link
        href="/contact"
        className="text-sm text-primary hover:text-copper-hover transition-colors underline underline-offset-4 w-fit"
      >
        View on map →
      </Link>
    </div>
  )
}
