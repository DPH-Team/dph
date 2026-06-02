import { Beer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tap } from "@/lib/fixtures/types"

export type TapCardProps = {
  tap: Tap
  className?: string
}

/**
 * Inner content shared by both the ghost placeholder and the live card.
 * The `descriptionVariant` prop drives the only difference between the two:
 *   - "clamped"  → ghost: line-clamp-2, always visible (sets reserved height)
 *   - "animated" → live card: height transitions from 3.85rem (2-line rest) to
 *                  h-auto (true content height) via interpolate-size, making
 *                  the card box grow downward smoothly on hover/focus-within.
 */
function CardContent({
  tap,
  descriptionVariant,
}: {
  tap: Tap
  descriptionVariant: "clamped" | "animated"
}) {
  return (
    <>
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
      </div>

      {descriptionVariant === "clamped" ? (
        /*
         * Ghost description: line-clamp-2 so the ghost occupies exactly the
         * collapsed card height. pointer-coarse removes the clamp on touch
         * devices so the ghost height matches the always-open live card.
         *
         * Height at rest matches the live card's h-[3.85rem]:
         *   text-sm (0.875rem) × leading-relaxed (1.625) × 2 lines ≈ 2.844rem
         *   + pb-4 (1rem) padding on this wrapper div
         *   = 3.844rem ≈ 3.85rem
         */
        <div className="px-4 pb-4">
          <p
            className={cn(
              "text-sm text-muted-foreground leading-relaxed line-clamp-2",
              "pointer-coarse:line-clamp-none"
            )}
          >
            {tap.description}
          </p>
        </div>
      ) : (
        /*
         * Live card description: animates between a fixed 2-line rest height
         * and h-auto (true content height) using `interpolate-size: allow-keywords`,
         * which enables CSS to transition to/from `height: auto` in supporting
         * browsers (Chrome 129+). In browsers without support (Safari, Firefox)
         * the height snaps open/closed instantly on hover — the scale/shadow lift
         * still animates, so the interaction remains polished everywhere.
         *
         * Rest height (h-[3.85rem]) calculation:
         *   text-sm (0.875rem) × leading-relaxed (1.625) × 2 lines ≈ 2.844rem
         *   + pb-4 (1rem) padding on the <p> inside this container
         *   = 3.844rem → 3.85rem
         *
         * pointer-coarse: h-auto always so touch users see full text without hover.
         * motion-reduce: transition-none snaps open instantly (acceptable).
         */
        <div
          className={cn(
            "px-4 overflow-hidden",
            "[interpolate-size:allow-keywords]",
            "transition-[height] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            "h-[3.85rem]",
            "group-hover:h-auto",
            "group-focus-within:h-auto",
            "pointer-coarse:h-auto",
            "motion-reduce:transition-none"
          )}
        >
          <p
            className={cn(
              "text-sm text-muted-foreground leading-relaxed pb-4",
              "line-clamp-2",
              "group-hover:line-clamp-none",
              "group-focus-within:line-clamp-none",
              "pointer-coarse:line-clamp-none"
            )}
          >
            {tap.description}
          </p>
        </div>
      )}
    </>
  )
}

export function TapCard({ tap, className }: TapCardProps) {
  /** Base article classes shared by both the ghost and the live card. */
  const articleBase = cn(
    "flex flex-col rounded-xl bg-card border",
    tap.isFeatured ? "border-packers-gold/60" : "border-border",
    className
  )

  return (
    /*
     * Grid-cell wrapper: overflow-visible lets the absolute live card spill
     * below the reserved cell without clipping. z-lift on hover/focus-within
     * ensures the growing card paints over the row beneath it.
     */
    <div className="relative overflow-visible hover:z-20 focus-within:z-20">

      {/*
       * Ghost placeholder — in normal document flow so the grid cell always
       * reserves exactly the collapsed card height (description clamped to
       * 2 lines). invisible keeps its layout footprint (unlike display:none /
       * hidden which collapse the space). aria-hidden prevents screen readers
       * from announcing duplicate content — the live card is the semantic source.
       */}
      <article aria-hidden="true" className={cn(articleBase, "invisible")}>
        <CardContent tap={tap} descriptionVariant="clamped" />
      </article>

      {/*
       * Live card — absolutely positioned so its height can grow downward
       * beyond the reserved cell without causing grid reflow. At rest it is
       * visually identical to the ghost (same border, bg, rounded-xl, and
       * description clipped to ~2-line height). On hover/focus-within the
       * description container's height transitions from 3.85rem to h-auto,
       * causing the card's bottom edge — border, background, and rounded
       * corners all as one piece — to glide downward revealing full text.
       */}
      <article
        tabIndex={0}
        aria-label={`${tap.name} by ${tap.brewery}`}
        className={cn(
          "group absolute inset-x-0 top-0",
          articleBase,
          // Scale + shadow lift animate with the same easing as the description reveal
          "transition-[border-color,transform,box-shadow] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "hover:scale-[1.025] focus-within:scale-[1.025]",
          // Depth shadow + brand-coloured glow layered in one box-shadow value
          tap.isFeatured
            ? "hover:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.806_0.165_81_/_0.38)] focus-within:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.806_0.165_81_/_0.38)]"
            : "hover:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.648_0.130_47_/_0.40)] focus-within:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.648_0.130_47_/_0.40)]",
          // Reduced-motion: suppress transforms; description still reveals instantly
          "motion-reduce:hover:scale-100 motion-reduce:focus-within:scale-100",
          // Featured vs normal hover border colour
          tap.isFeatured
            ? "hover:border-packers-gold focus-within:border-packers-gold"
            : "hover:border-border/60 focus-within:border-border/60"
        )}
      >
        <CardContent tap={tap} descriptionVariant="animated" />
      </article>
    </div>
  )
}
