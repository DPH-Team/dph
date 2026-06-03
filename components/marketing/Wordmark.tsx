import Link from "next/link"
import { cn } from "@/lib/utils"

type WordmarkSize = "sm" | "md" | "lg"
type WordmarkTone = "gold" | "cream"

export type WordmarkProps = {
  size?: WordmarkSize
  tone?: WordmarkTone
  className?: string
  asLink?: boolean
}

const sizeClasses: Record<WordmarkSize, string> = {
  sm: "text-sm tracking-wide",
  md: "text-base tracking-wide",
  lg: "text-lg tracking-wide",
}

const toneClasses: Record<WordmarkTone, string> = {
  gold: "text-packers-gold",
  cream: "text-cream",
}

export function Wordmark({
  size = "md",
  tone = "gold",
  className,
  asLink = true,
}: WordmarkProps) {
  const text = "District Pour Haus"
  const classes = cn(
    "font-display font-medium whitespace-nowrap",
    sizeClasses[size],
    toneClasses[tone],
    className
  )

  if (asLink) {
    return (
      <Link href="/" className={cn(classes, "hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm")}>
        {text}
      </Link>
    )
  }

  return <span className={classes}>{text}</span>
}
