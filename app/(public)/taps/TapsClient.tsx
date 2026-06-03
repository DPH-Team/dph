"use client"

import { useState, useCallback, useEffect } from "react"
import { TapFilters } from "@/components/marketing/TapFilters"
import { TapCard } from "@/components/marketing/TapCard"
import { Button } from "@/components/ui/button"
import type { Tap } from "@/lib/fixtures/types"

export type TapsClientProps = {
  taps: Tap[]
}

export function TapsClient({ taps }: TapsClientProps) {
  const [filtered, setFiltered] = useState<Tap[]>(taps)
  const [isSticky, setIsSticky] = useState(false)

  const handleChange = useCallback((result: Tap[]) => {
    setFiltered(result)
  }, [])

  useEffect(() => {
    const sentinel = document.getElementById("filter-sentinel")
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(entry ? !entry.isIntersecting : false),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Sticky filter sentinel */}
      <div id="filter-sentinel" aria-hidden="true" />

      <div
        className={
          isSticky
            ? "sticky top-[80px] z-30 bg-background/90 backdrop-blur-md border-b border-border -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 transition-shadow shadow-lg"
            : "py-3"
        }
      >
        <TapFilters taps={taps} onChange={handleChange} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">No taps match your filters.</p>
          <Button
            variant="ghost"
            onClick={() => {
              setFiltered(taps)
            }}
            className="text-primary hover:text-copper-hover border border-border"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tap) => (
            <TapCard key={tap.id} tap={tap} />
          ))}
        </div>
      )}
    </>
  )
}
