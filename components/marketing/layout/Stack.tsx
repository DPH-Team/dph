import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

type Gap = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16
type Align = "start" | "center" | "end" | "stretch"
type Justify = "start" | "center" | "end" | "between" | "around"

const gapClasses: Record<Gap, string> = {
  1:  "gap-1",
  2:  "gap-2",
  3:  "gap-3",
  4:  "gap-4",
  6:  "gap-6",
  8:  "gap-8",
  12: "gap-12",
  16: "gap-16",
}

const alignClasses: Record<Align, string> = {
  start:   "items-start",
  center:  "items-center",
  end:     "items-end",
  stretch: "items-stretch",
}

const justifyClasses: Record<Justify, string> = {
  start:   "justify-start",
  center:  "justify-center",
  end:     "justify-end",
  between: "justify-between",
  around:  "justify-around",
}

type StackProps = {
  direction?: "row" | "col"
  gap?: Gap
  align?: Align
  justify?: Justify
  wrap?: boolean
  className?: string
  children?: React.ReactNode
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "children">

export function Stack({
  direction = "col",
  gap = 4,
  align,
  justify,
  wrap = false,
  className,
  children,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        gap ? gapClasses[gap] : undefined,
        align ? alignClasses[align] : undefined,
        justify ? justifyClasses[justify] : undefined,
        wrap ? "flex-wrap" : undefined,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
