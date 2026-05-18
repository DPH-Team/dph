"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function TabsDemo() {
  return (
    <Tabs defaultValue="drafts">
      <TabsList>
        <TabsTrigger value="drafts">Drafts</TabsTrigger>
        <TabsTrigger value="cans">Cans</TabsTrigger>
        <TabsTrigger value="cocktails">Cocktails</TabsTrigger>
      </TabsList>
      <TabsContent value="drafts" className="pt-4">
        <p className="text-sm text-muted-foreground">
          24 draft lines featuring local craft beers, rotating seasonals, and
          regional favorites — all self-pour via RFID card.
        </p>
      </TabsContent>
      <TabsContent value="cans" className="pt-4">
        <p className="text-sm text-muted-foreground">
          Curated can selection spanning IPAs, sours, stouts, and ciders.
          Priced by the unit; no card required.
        </p>
      </TabsContent>
      <TabsContent value="cocktails" className="pt-4">
        <p className="text-sm text-muted-foreground">
          House cocktail menu crafted by our bar team. Rotating specials every
          Friday evening.
        </p>
      </TabsContent>
    </Tabs>
  )
}
