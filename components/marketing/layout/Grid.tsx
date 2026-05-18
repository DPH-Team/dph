import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

type ColsValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
type ResponsiveCols = {
  base?: ColsValue
  sm?: ColsValue
  md?: ColsValue
  lg?: ColsValue
  xl?: ColsValue
}
type Gap = 1 | 2 | 3 | 4 | 6 | 8 | 12

/* Static maps so Tailwind's class scanner can detect every class string */
const BASE_COLS: Record<ColsValue, string> = {
  1: "grid-cols-1",   2: "grid-cols-2",   3: "grid-cols-3",
  4: "grid-cols-4",   5: "grid-cols-5",   6: "grid-cols-6",
  7: "grid-cols-7",   8: "grid-cols-8",   9: "grid-cols-9",
  10: "grid-cols-10", 11: "grid-cols-11", 12: "grid-cols-12",
}
const SM_COLS: Record<ColsValue, string> = {
  1: "sm:grid-cols-1",   2: "sm:grid-cols-2",   3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",   5: "sm:grid-cols-5",   6: "sm:grid-cols-6",
  7: "sm:grid-cols-7",   8: "sm:grid-cols-8",   9: "sm:grid-cols-9",
  10: "sm:grid-cols-10", 11: "sm:grid-cols-11", 12: "sm:grid-cols-12",
}
const MD_COLS: Record<ColsValue, string> = {
  1: "md:grid-cols-1",   2: "md:grid-cols-2",   3: "md:grid-cols-3",
  4: "md:grid-cols-4",   5: "md:grid-cols-5",   6: "md:grid-cols-6",
  7: "md:grid-cols-7",   8: "md:grid-cols-8",   9: "md:grid-cols-9",
  10: "md:grid-cols-10", 11: "md:grid-cols-11", 12: "md:grid-cols-12",
}
const LG_COLS: Record<ColsValue, string> = {
  1: "lg:grid-cols-1",   2: "lg:grid-cols-2",   3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",   5: "lg:grid-cols-5",   6: "lg:grid-cols-6",
  7: "lg:grid-cols-7",   8: "lg:grid-cols-8",   9: "lg:grid-cols-9",
  10: "lg:grid-cols-10", 11: "lg:grid-cols-11", 12: "lg:grid-cols-12",
}
const XL_COLS: Record<ColsValue, string> = {
  1: "xl:grid-cols-1",   2: "xl:grid-cols-2",   3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",   5: "xl:grid-cols-5",   6: "xl:grid-cols-6",
  7: "xl:grid-cols-7",   8: "xl:grid-cols-8",   9: "xl:grid-cols-9",
  10: "xl:grid-cols-10", 11: "xl:grid-cols-11", 12: "xl:grid-cols-12",
}
const GAP_CLASSES: Record<Gap, string> = {
  1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4",
  6: "gap-6", 8: "gap-8", 12: "gap-12",
}

type GridProps = {
  cols?: ColsValue | ResponsiveCols
  gap?: Gap
  className?: string
  children?: React.ReactNode
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">

export function Grid({
  cols = 1,
  gap = 4,
  className,
  children,
  ...props
}: GridProps) {
  const colClasses: string[] = []

  if (typeof cols === "number") {
    colClasses.push(BASE_COLS[cols])
  } else {
    if (cols.base) colClasses.push(BASE_COLS[cols.base])
    if (cols.sm)   colClasses.push(SM_COLS[cols.sm])
    if (cols.md)   colClasses.push(MD_COLS[cols.md])
    if (cols.lg)   colClasses.push(LG_COLS[cols.lg])
    if (cols.xl)   colClasses.push(XL_COLS[cols.xl])
  }

  return (
    <div
      className={cn(
        "grid",
        ...colClasses,
        GAP_CLASSES[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
