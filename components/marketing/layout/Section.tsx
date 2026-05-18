import type { ElementType, ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

type Padding = "sm" | "md" | "lg"
type Bg = "default" | "muted" | "card"

const paddingClasses: Record<Padding, string> = {
  sm: "[padding-block:clamp(2.5rem,6vw,4rem)]",
  md: "[padding-block:clamp(4rem,9vw,7rem)]",
  lg: "[padding-block:clamp(6rem,12vw,10rem)]",
}

const bgClasses: Record<Bg, string> = {
  default: "bg-background",
  muted:   "bg-muted",
  card:    "bg-card",
}

type SectionProps<T extends ElementType = "section"> = {
  as?: T
  padding?: Padding
  bg?: Bg
  className?: string
  children?: React.ReactNode
} & Omit<ComponentPropsWithoutRef<T>, "as" | "padding" | "bg" | "className" | "children">

export function Section<T extends ElementType = "section">({
  as,
  padding = "md",
  bg = "default",
  className,
  children,
  ...props
}: SectionProps<T>) {
  const Tag = (as ?? "section") as ElementType
  return (
    <Tag
      className={cn(paddingClasses[padding], bgClasses[bg], className)}
      {...props}
    >
      {children}
    </Tag>
  )
}
