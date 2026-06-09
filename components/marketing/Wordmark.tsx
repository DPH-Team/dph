import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

type WordmarkSize = "sm" | "md" | "lg"

export type WordmarkProps = {
  size?: WordmarkSize
  className?: string
  asLink?: boolean
  glow?: boolean
}

/** Rendered height in px for each size; width = height × 5 (5:1 logo ratio). */
const sizeDimensions: Record<WordmarkSize, { h: number; w: number }> = {
  sm: { h: 44, w: 220 },
  md: { h: 60, w: 300 },
  lg: { h: 40, w: 200 },
}

export function Wordmark({ size = "md", className, asLink = true, glow = true }: WordmarkProps) {
  const { h, w } = sizeDimensions[size]

  const img = (
    <Image
      src="/brand/logo_horizontal.svg"
      alt="District Pour Haus"
      width={w}
      height={h}
      className={cn(
        "block",
        glow &&
          "filter-[drop-shadow(0_0_8px_rgba(201,123,74,0.35))_drop-shadow(0_0_18px_rgba(201,123,74,0.2))]",
        className
      )}
      priority
    />
  )

  if (asLink) {
    return (
      <Link
        href="/"
        className="rounded-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {img}
      </Link>
    )
  }

  return img
}
