"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MenuItem } from "@/components/marketing/MenuItem"
import type { MenuSection } from "@/lib/fixtures/types"

export type MenuSectionTabsProps = {
  sections: MenuSection[]
}

const ALLERGEN_LEGEND = [
  { key: "GF", label: "Gluten" },
  { key: "D", label: "Dairy" },
  { key: "N", label: "Nuts" },
  { key: "SF", label: "Shellfish" },
  { key: "E", label: "Egg" },
  { key: "S", label: "Soy" },
] as const

export function MenuSectionTabs({ sections }: MenuSectionTabsProps) {
  const defaultValue = sections[0]?.id ?? ""

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList className="mb-8">
        {sections.map((section) => (
          <TabsTrigger key={section.id} value={section.id}>
            {section.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {sections.map((section) => (
        <TabsContent key={section.id} value={section.id}>
          <h2 className="sr-only">{section.name}</h2>
          {section.description && (
            <p className="text-sm text-muted-foreground mb-6">{section.description}</p>
          )}
          <div className="flex flex-col">
            {section.items
              .filter((item) => item.available)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  variant="list"
                  showPrice={section.showPrices && item.showPrice}
                />
              ))}
          </div>
        </TabsContent>
      ))}

      <div className="mt-12 pt-6 border-t border-border">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Allergen Key
        </p>
        <div className="flex flex-wrap gap-2">
          {ALLERGEN_LEGEND.map(({ key, label }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-border text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{key}</span>
              {label}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 italic">
          Menu may vary. Ask staff about allergens before ordering.
        </p>
      </div>
    </Tabs>
  )
}
