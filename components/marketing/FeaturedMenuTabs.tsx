"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MenuItem } from "@/components/marketing/MenuItem"
import type { MenuSection } from "@/lib/fixtures/types"

export type FeaturedMenuTabsProps = {
  sections: MenuSection[]
}

const FEATURED_ITEM_COUNT = 6

export function FeaturedMenuTabs({ sections }: FeaturedMenuTabsProps) {
  return (
    <Tabs defaultValue={sections[0]?.id ?? ""}>
      <div className="overflow-x-auto no-scrollbar w-full mb-8">
        <TabsList className="w-max">
          {sections.map((section) => (
            <TabsTrigger key={section.id} value={section.id}>
              {section.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {sections.map((section) => (
        <TabsContent key={section.id} value={section.id}>
          <div className="grid sm:grid-cols-2 gap-4">
            {section.items.slice(0, FEATURED_ITEM_COUNT).map((item) => (
              <MenuItem
                key={item.id}
                item={item}
                variant="featured"
                showPrice={section.showPrices && item.showPrice}
              />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
