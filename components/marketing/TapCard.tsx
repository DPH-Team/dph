import { Beer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tap } from "@/lib/fixtures/types"

export type TapCardProps = {
  tap: Tap
  className?: string
}

/**
 * Inner content shared by both the ghost placeholder and the live card.
 *
 * descriptionVariant controls the description container behaviour:
 *   "ghost"  — fixed height (h-[3.85rem] + overflow-hidden) so the grid cell
 *              always reserves exactly 2 lines of description space, regardless
 *              of whether the description is 1 or 2+ lines.
 *   "live"   — max-height transitions from 3.85rem (rest) to 40rem (hover/focus),
 *              animating in all browsers via max-height alone. min-h-[3.85rem]
 *              ensures a 1-line description still occupies the full 2-line
 *              reserved height, keeping the live card identical to the ghost.
 *
 * Height derivation (3.85rem):
 *   text-sm (0.875rem) × leading-relaxed (1.625) × 2 lines = 2.844rem
 *   pb-4 bottom padding (1rem)                              = 3.844rem → 3.85rem
 */
function CardContent({
  tap,
  descriptionVariant,
}: {
  tap: Tap
  descriptionVariant: "ghost" | "live"
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
        {/* Top row: tap number + beer name/brewery */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="tabular-nums text-xl font-display font-medium text-primary leading-none w-7 shrink-0"
              aria-label={`Tap number ${tap.tapNumber}`}
            >
              {tap.tapNumber}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="font-display font-medium text-base leading-tight text-foreground truncate">
                {tap.name}
              </h2>
              <p className="text-xs text-muted-foreground truncate">{tap.brewery}</p>
            </div>
          </div>
        </div>

        {/*
         * Meta row: style pill + ABV + IBU on a SINGLE non-wrapping line.
         *
         * flex-nowrap + shrink-0 on ABV/IBU prevent those values from ever
         * moving to a second line. The style pill gets max-w-[9rem] + truncate
         * so long style names (e.g. "IPA - Imperial / Double New England / Hazy")
         * are cut with an ellipsis instead of pushing the row wider and causing
         * ABV/IBU to wrap — which would make some cards taller than others.
         */}
        <div className="flex items-center gap-3 flex-nowrap min-w-0">
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-background border border-border text-muted-foreground max-w-[9rem] truncate shrink">
            {tap.style}
          </span>
          <span className="tabular-nums text-xs text-muted-foreground shrink-0">
            {tap.abv.toFixed(1)}% ABV
          </span>
          {tap.ibu !== null && (
            <span className="tabular-nums text-xs text-muted-foreground shrink-0">
              {tap.ibu} IBU
            </span>
          )}
        </div>
      </div>

      {descriptionVariant === "ghost" ? (
        /*
         * Ghost description: fixed height (h-[3.85rem] + overflow-hidden) so
         * the grid cell always reserves exactly 2 lines of space. A 1-line
         * description does NOT shrink the cell — overflow-hidden clips any
         * excess if the content is somehow taller.
         *
         * pointer-coarse: touch devices always show full text on the live card,
         * so the ghost must also expand (h-auto) to keep ghost and live in sync
         * and avoid the grid cell being under-reserved on touch.
         */
        <div
          className={cn(
            "px-4 pb-4 overflow-hidden",
            "h-[3.85rem]",
            "pointer-coarse:h-auto",
          )}
        >
          <p
            className={cn(
              "text-sm text-muted-foreground leading-relaxed",
              "line-clamp-2",
              "pointer-coarse:line-clamp-none",
            )}
          >
            {tap.description}
          </p>
        </div>
      ) : (
        /*
         * Live card description container.
         *
         * Rest state (no hover/focus):
         *   max-h-[3.85rem]  — clamps the container to exactly 2 lines + pb-4.
         *   min-h-[3.85rem]  — ensures a 1-line description still occupies the
         *                      full 2-line reserved height, so the live card is
         *                      always the same height as the ghost cell.
         *   overflow-hidden  — the hard guarantee: no content can escape the
         *                      container regardless of browser or CSS support.
         *   line-clamp-2     — visual ellipsis on the text itself.
         *
         * Hover/focus state:
         *   max-h-[40rem]    — generous ceiling well above any real description;
         *                      the container grows from 3.85rem to content height.
         *   line-clamp-none  — removes the ellipsis once expanded.
         *
         * Cross-browser animation strategy:
         *   transition-[max-height] works in every browser (Chrome, Firefox,
         *   Safari) — no interpolate-size dependency. The max-height grows from
         *   3.85rem → 40rem, which triggers a smooth expansion everywhere.
         *   interpolate-size:allow-keywords is NOT used here; the clamp relies
         *   solely on overflow-hidden + max-height.
         *
         * pointer-coarse:  always expanded (touch — no hover event available).
         * motion-reduce:   transition-none → instant snap (still reveals text).
         */
        <div
          className={cn(
            "px-4 pb-4 overflow-hidden",
            "max-h-[3.85rem]",
            "min-h-[3.85rem]",
            // Expanded state
            "group-hover:max-h-[40rem]",
            "group-focus-within:max-h-[40rem]",
            // Touch: always expanded, no height cap
            "pointer-coarse:max-h-[40rem]",
            "pointer-coarse:min-h-0",
            // Animation
            "transition-[max-height] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            "motion-reduce:transition-none",
          )}
        >
          <p
            className={cn(
              "text-sm text-muted-foreground leading-relaxed",
              "line-clamp-2 overflow-hidden",
              "group-hover:line-clamp-none",
              "group-focus-within:line-clamp-none",
              "pointer-coarse:line-clamp-none",
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
  const articleBase = cn(
    "flex flex-col rounded-xl bg-card border",
    tap.isFeatured ? "border-packers-gold/60" : "border-border",
    className,
  )

  return (
    /*
     * Grid-cell wrapper: overflow-visible lets the absolute live card spill
     * below the reserved cell without clipping. z-lift on hover/focus-within
     * ensures the expanding card paints over the row beneath it.
     */
    <div className="relative overflow-visible hover:z-20 focus-within:z-20">

      {/*
       * Ghost placeholder — in normal document flow so the grid cell reserves
       * the collapsed card height. invisible preserves layout footprint (unlike
       * display:none which collapses the space). aria-hidden keeps screen
       * readers off the duplicate content.
       */}
      <article aria-hidden="true" className={cn(articleBase, "invisible")}>
        <CardContent tap={tap} descriptionVariant="ghost" />
      </article>

      {/*
       * Live card — absolutely positioned so its height can grow downward
       * beyond the reserved cell without causing grid reflow. At rest it is
       * visually identical to the ghost (same border, bg, rounded-xl, and
       * description clamped to the same 3.85rem rest height). On hover/focus the
       * description container's max-height transitions to 40rem, causing the
       * card's bottom edge to glide downward revealing the full text.
       */}
      <article
        tabIndex={0}
        aria-label={`${tap.name} by ${tap.brewery}`}
        className={cn(
          "group absolute inset-x-0 top-0",
          articleBase,
          "transition-[border-color,transform,box-shadow] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "hover:scale-[1.025] focus-within:scale-[1.025]",
          tap.isFeatured
            ? "hover:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.806_0.165_81_/_0.38)] focus-within:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.806_0.165_81_/_0.38)]"
            : "hover:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.648_0.130_47_/_0.40)] focus-within:shadow-[0_12px_32px_-8px_oklch(0_0_0_/_0.55),_0_0_28px_4px_oklch(0.648_0.130_47_/_0.40)]",
          "motion-reduce:hover:scale-100 motion-reduce:focus-within:scale-100",
          tap.isFeatured
            ? "hover:border-packers-gold focus-within:border-packers-gold"
            : "hover:border-border/60 focus-within:border-border/60",
        )}
      >
        <CardContent tap={tap} descriptionVariant="live" />
      </article>
    </div>
  )
}
