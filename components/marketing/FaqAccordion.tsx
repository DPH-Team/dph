"use client"

import { Accordion } from "@base-ui/react/accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FaqEntry } from "@/lib/fixtures/types"

export type FaqAccordionProps = {
  entries: FaqEntry[]
  className?: string
}

export function FaqAccordion({ entries, className }: FaqAccordionProps) {
  return (
    <Accordion.Root
      className={cn("flex flex-col divide-y divide-border", className)}
      aria-label="Frequently asked questions"
    >
      {entries.map((entry) => (
        <Accordion.Item key={entry.id} value={entry.id}>
          <Accordion.Header>
            <Accordion.Trigger
              className={cn(
                "group flex w-full items-center justify-between gap-4 py-4 text-left",
                "text-sm font-medium text-foreground",
                "hover:text-primary transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm",
                "data-open:text-primary"
              )}
            >
              <span>{entry.question}</span>
              <ChevronDown
                size={16}
                className="shrink-0 text-muted-foreground transition-transform duration-200 group-data-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel
            className={cn(
              "overflow-hidden text-sm text-muted-foreground leading-relaxed",
              "data-open:animate-in data-open:fade-in-0",
              "data-closed:animate-out data-closed:fade-out-0",
              "pb-4"
            )}
          >
            {entry.answer}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
