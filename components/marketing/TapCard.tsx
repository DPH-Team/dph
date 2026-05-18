import { Beer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tap } from "@/lib/fixtures/types"

export type TapCardProps = {
  tap: Tap
  className?: string
}

export function TapCard({ tap, className }: TapCardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-xl bg-card border overflow-hidden transition-colors",
        tap.isFeatured
          ? "border-packers-gold/60 hover:border-packers-gold"
          : "border-border hover:border-border/60",
        className
      )}
    >
      {tap.isFeatured && (
        <div className="flex items-center gap-2 bg-packers-green px-4 py-2">
          <Beer className="h-3.5 w-3.5 text-packers-gold shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-packers-gold">
            Tap Takeover
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="tabular-nums text-xl font-display font-medium text-primary leading-none w-7 shrink-0"
              aria-label={`Tap number ${tap.tapNumber}`}
            >
              {tap.tapNumber}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <h3 className="font-display font-medium text-base leading-tight text-foreground truncate">
                {tap.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{tap.brewery}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-background border border-border text-muted-foreground">
            {tap.style}
          </span>
          <span className="tabular-nums text-xs text-muted-foreground">
            {tap.abv.toFixed(1)}% ABV
          </span>
          {tap.ibu !== null && (
            <span className="tabular-nums text-xs text-muted-foreground">
              {tap.ibu} IBU
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {tap.description}
        </p>
      </div>
    </article>
  )
}
