import type { ElementType, ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

type Size = "sm" | "md" | "lg" | "xl" | "full"

const maxWidths: Record<Size, string> = {
  sm:   "max-w-[40rem]",
  md:   "max-w-[48rem]",
  lg:   "max-w-[72rem]",
  xl:   "max-w-[80rem]",
  full: "max-w-full",
}

type ContainerProps<T extends ElementType = "div"> = {
  as?: T
  size?: Size
  className?: string
  children?: React.ReactNode
} & Omit<ComponentPropsWithoutRef<T>, "as" | "size" | "className" | "children">

export function Container<T extends ElementType = "div">({
  as,
  size = "xl",
  className,
  children,
  ...props
}: ContainerProps<T>) {
  const Tag = (as ?? "div") as ElementType
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        maxWidths[size],
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
