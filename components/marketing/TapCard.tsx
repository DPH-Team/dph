import { Beer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tap } from "@/lib/fixtures/types"

export type TapCardProps = {
  tap: Tap
  className?: string
}

export function TapCard({ tap, className }: TapCardProps) {
  return (
    /**
     * Outer wrapper: stable grid cell — overflow-visible so the grown card
     * can spill outside the reserved cell without reflowing rows.
     */
    <div className="relative z-0 overflow-visible">
      <article
        tabIndex={0}
        aria-label={`${tap.name} by ${tap.brewery}`}
        className={cn(
          // Layout & base — no overflow-hidden so the expanded description
          // can spill below the card boundary without being clipped
          "group relative flex flex-col rounded-xl bg-card border",
          // Transition: colors + transform + shadow together
          "transition-[border-color,transform,box-shadow] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          // Grow + lift on hover/focus-within
          "hover:scale-[1.025] hover:z-20 hover:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55)]",
          "focus-within:scale-[1.025] focus-within:z-20 focus-within:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55)]",
          // Suppress transforms under reduced-motion (description reveal still works)
          "motion-reduce:hover:scale-100 motion-reduce:focus-within:scale-100",
          // Featured vs normal border
          tap.isFeatured
            ? "border-packers-gold/60 hover:border-packers-gold focus-within:border-packers-gold"
            : "border-border hover:border-border/60 focus-within:border-border/60",
          className
        )}
      >
        {tap.isFeatured && (
          <div className="flex items-center gap-2 bg-packers-green px-4 py-2 rounded-t-xl">
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

          {/*
           * Description reveal:
           *
           * Collapsed layer (in normal flow) — reserves height so the card's
           * footprint in the grid never changes. Becomes invisible (not display:none)
           * on hover/focus so the card cell keeps its size. This is the semantic
           * source read by screen readers; the duplicate expanded layer is
           * aria-hidden.
           *
           * Expanded layer (absolute) — fades in over the collapsed placeholder on
           * hover/focus-within and can extend below the card boundary. bg-card +
           * pb-4 + rounded-b-xl make it look like a natural card extension. Because
           * the article has hover:z-20, the spilled text sits above sibling cards.
           *
           * Touch devices (pointer: coarse): no hover is available, so we unclaim
           * the 2-line clamp on the collapsed layer and hide the expanded layer
           * entirely — full text is always visible without interaction.
           */}
          <div className="relative">
            {/* Collapsed layer — semantic, visible at rest, invisible on hover/focus */}
            <p
              className={cn(
                "text-sm text-muted-foreground leading-relaxed line-clamp-2",
                "group-hover:invisible group-focus-within:invisible",
                // Touch: always show full text (pointer-coarse custom variant in globals.css)
                "pointer-coarse:line-clamp-none"
              )}
            >
              {tap.description}
            </p>

            {/* Expanded layer — duplicate for visual overlay; hidden from screen readers */}
            <p
              aria-hidden="true"
              className={cn(
                "absolute top-0 left-0 right-0 z-10",
                "text-sm text-muted-foreground leading-relaxed",
                "bg-card pb-4 rounded-b-xl",
                // Hidden at rest, shown on hover/focus-within
                "opacity-0 pointer-events-none",
                "group-hover:opacity-100 group-hover:pointer-events-auto",
                "group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
                // Fade transition (transform suppression via motion-reduce: on article above)
                "transition-opacity duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                "motion-reduce:transition-none",
                // Touch: not needed — collapsed layer already shows full text
                "pointer-coarse:hidden"
              )}
            >
              {tap.description}
            </p>
          </div>
        </div>
      </article>
    </div>
  )
}
