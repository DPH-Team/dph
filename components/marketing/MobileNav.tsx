"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Link2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Wordmark } from "./Wordmark"
import { HoursCard } from "./HoursCard"
import { cn } from "@/lib/utils"
import type { WeeklyHours, HoursOverride } from "@/lib/fixtures/types"

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/taps", label: "Taps" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/gallery", label: "Gallery" },
  { href: "/merch", label: "Merch" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
]

export type MobileNavProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  hours: WeeklyHours
  overrides: HoursOverride[]
}

export function MobileNav({ open, onOpenChange, hours, overrides }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-80 max-w-[80vw] flex flex-col gap-0 p-0"
        showCloseButton={false}
      >
        <SheetHeader className="flex flex-row items-center justify-between p-4 border-b border-border">
          <Wordmark size="md" tone="gold" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close navigation"
            className="hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto py-4 px-4">
          <ul className="flex flex-col gap-1" role="list">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/")
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "block font-display text-xl font-medium py-2 px-2 rounded-md transition-colors",
                      "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "text-primary underline underline-offset-4 decoration-primary"
                        : "text-foreground/80"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-4 flex flex-col gap-4">
          <HoursCard hours={hours} overrides={overrides} variant="compact" />

          <div className="flex flex-col gap-1.5">
            <a
              href="tel:+19205550142"
              className="text-sm text-primary hover:text-[--color-copper-hover] transition-colors font-medium"
            >
              (920) 555-0142
            </a>
            <p className="text-sm text-muted-foreground">123 Main Street, Green Bay, WI</p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/districtpourhaus"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-foreground/70 hover:text-primary transition-colors"
            >
              <Link2 size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="p-4 pt-0">
          <Button
            className="w-full"
            size="lg"
            render={
              <Link href="/reservations" onClick={() => onOpenChange(false)} />
            }
          >
            Reserve a Table
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
