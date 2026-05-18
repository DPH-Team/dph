"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        /* Underline style: 1px bottom border, horizontal gap, no background pill */
        "group/tabs-list inline-flex w-full items-end gap-6 border-b border-border bg-transparent px-0 group-data-vertical/tabs:flex-col group-data-vertical/tabs:border-b-0 group-data-vertical/tabs:border-r",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        /* Base: muted text, padding, no bg */
        "relative inline-flex items-center justify-center gap-1.5 py-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none",
        /* Hover */
        "hover:text-foreground",
        /* Active: foreground text + copper 2px underline via after pseudo */
        "data-active:text-foreground",
        "after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-300 after:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
        "data-active:after:scale-x-100",
        /* Focus visible */
        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        /* Disabled */
        "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
