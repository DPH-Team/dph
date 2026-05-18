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
        "relative flex flex-col gap-3 p-4 rounded-xl bg-card border border-border",
        "hover:border-border/60 transition-colors",
        className
      )}
    >
      {tap.isFeatured && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-[--color-packers-gold] text-[--color-brand-base]">
            Tap Takeover
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 pr-2">
        <div className="flex items-center gap-2">
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
    </article>
  )
}
