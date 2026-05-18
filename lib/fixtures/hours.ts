import type { WeeklyHours, HoursOverride } from "./types"

export const weeklyHours: WeeklyHours = {
  monday: { open: "15:00", close: "22:00", closed: false },
  tuesday: { open: "15:00", close: "22:00", closed: false },
  wednesday: { open: "15:00", close: "23:00", closed: false },
  thursday: { open: "15:00", close: "23:00", closed: false },
  friday: { open: "12:00", close: "00:00", closed: false },
  saturday: { open: "11:00", close: "00:00", closed: false },
  sunday: { open: "11:00", close: "21:00", closed: false },
}

export const hoursOverrides: HoursOverride[] = [
  {
    date: "2026-05-25",
    open: "11:00",
    close: "23:00",
    closed: false,
    note: "Extended hours for Memorial Day weekend",
  },
]

export async function getWeeklyHours(): Promise<WeeklyHours> {
  return weeklyHours
}

export async function getHoursOverrides(): Promise<HoursOverride[]> {
  return hoursOverrides
}
