"use client"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function SheetDemo() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open sheet
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Tap details</SheetTitle>
          <SheetDescription>
            View full pour history and current keg level for this tap handle.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Keg level: 68% remaining</p>
          <p className="mt-2">Last pour: 3 minutes ago</p>
          <p className="mt-2">Total pours today: 47</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
