import { cn } from "@/lib/utils"
import type { MenuItem as MenuItemType } from "@/lib/fixtures/types"

const ALLERGEN_LABELS: Record<string, string> = {
  gluten: "GF",
  dairy: "D",
  nuts: "N",
  shellfish: "SF",
  egg: "E",
  soy: "S",
}

const ALLERGEN_FULL: Record<string, string> = {
  gluten: "Contains gluten",
  dairy: "Contains dairy",
  nuts: "Contains nuts",
  shellfish: "Contains shellfish",
  egg: "Contains egg",
  soy: "Contains soy",
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export type MenuItemProps = {
  item: MenuItemType
  variant?: "list" | "featured"
  className?: string
}

export function MenuItem({ item, variant = "list", className }: MenuItemProps) {
  if (variant === "featured") {
    return (
      <article
        className={cn(
          "flex flex-col gap-3 p-4 rounded-xl bg-card border border-border",
          !item.available && "opacity-60",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-medium text-base text-foreground leading-tight">
            {item.name}
          </h3>
          <span className="tabular-nums text-sm font-medium text-primary shrink-0">
            {formatPrice(item.priceCents)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {item.description}
        </p>
        {item.allergens.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap" role="list" aria-label="Allergens">
            {item.allergens.map((a) => (
              <span
                key={a}
                role="listitem"
                title={ALLERGEN_FULL[a]}
                className="text-xs font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                aria-label={ALLERGEN_FULL[a]}
              >
                {ALLERGEN_LABELS[a] ?? a}
              </span>
            ))}
          </div>
        )}
        {!item.available && (
          <span className="text-xs text-muted-foreground italic">Currently unavailable</span>
        )}
      </article>
    )
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-4 border-b border-border last:border-0",
        !item.available && "opacity-60",
        className
      )}
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="font-display font-medium text-base text-foreground">
            {item.name}
          </h3>
          {!item.available && (
            <span className="text-xs text-muted-foreground italic">(unavailable)</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
        {item.allergens.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1" role="list" aria-label="Allergens">
            {item.allergens.map((a) => (
              <span
                key={a}
                role="listitem"
                title={ALLERGEN_FULL[a]}
                className="text-xs font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                aria-label={ALLERGEN_FULL[a]}
              >
                {ALLERGEN_LABELS[a] ?? a}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="tabular-nums text-sm font-medium text-primary shrink-0 pt-0.5">
        {formatPrice(item.priceCents)}
      </span>
    </div>
  )
}
