"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useScroll, useMotionValueEvent, useReducedMotion } from "framer-motion"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Wordmark } from "./Wordmark"
import { OpenStatusPill } from "./OpenStatusPill"
import { MobileNav } from "./MobileNav"
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
]

export type SiteHeaderProps = {
  hours: WeeklyHours
  overrides: HoursOverride[]
}

export function SiteHeader({ hours, overrides }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 80)
  })

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 flex items-center",
          "h-[72px] lg:h-[80px]",
          reduced
            ? scrolled
              ? "bg-background/85 backdrop-blur-md border-b border-border"
              : "bg-transparent"
            : cn(
                "transition-[background-color,border-color,backdrop-filter]",
                "duration-200 ease-in-out",
                scrolled
                  ? "bg-background/85 backdrop-blur-md border-b border-border"
                  : "bg-transparent border-b border-transparent"
              )
        )}
        aria-label="Site header"
      >
        <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1 lg:flex-none">
            <Wordmark size="md" tone="gold" />
            <OpenStatusPill
              hours={hours}
              overrides={overrides}
              className="hidden lg:inline-flex"
            />
          </div>

          <nav
            className="hidden lg:flex flex-1 items-center justify-center gap-1"
            aria-label="Primary navigation"
          >
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/")
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "hover:text-primary",
                    isActive
                      ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                      : "text-foreground/70"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2 ml-auto lg:ml-0">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              Contact
            </Button>
            <Button
              variant="default"
              size="sm"
              nativeButton={false}
              render={<Link href="/reservations" />}
            >
              Reserve
            </Button>
          </div>

          <button
            className={cn(
              "lg:hidden ml-auto p-2 rounded-md text-foreground/80 hover:text-primary transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div id="mobile-nav">
        <MobileNav
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          hours={hours}
          overrides={overrides}
        />
      </div>

      <div className="h-[72px] lg:h-[80px]" aria-hidden="true" />
    </>
  )
}
