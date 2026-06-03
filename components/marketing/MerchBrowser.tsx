"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { MerchProductCard } from "@/components/marketing/MerchProductCard"
import { SectionHeading } from "@/components/marketing/SectionHeading"
import { ShoppingBag } from "lucide-react"
import { PRINTIFY_STORE_URL } from "@/lib/fixtures/merch"
import type { MerchProduct } from "@/lib/fixtures/types"

const PAGE_SIZE = 12

type MerchBrowserProps = {
  products: MerchProduct[]
}

function deriveCategories(products: MerchProduct[]): string[] {
  const unique = Array.from(new Set(products.map((p) => p.category))).sort()
  return ["All", ...unique]
}

export function MerchBrowser({ products }: MerchBrowserProps) {
  const categories = deriveCategories(products)
  const [activeCategory, setActiveCategory] = useState<string>("All")
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory)

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat)
    setVisibleCount(PAGE_SIZE)
  }, [])

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + PAGE_SIZE)
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, visibleCount])

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <ShoppingBag
          size={40}
          className="text-muted-foreground/50"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-foreground">
            No products available right now
          </p>
          <p className="text-sm text-muted-foreground">
            New drops coming soon —{" "}
            <a
              href={PRINTIFY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-copper-hover transition-colors underline underline-offset-4"
            >
              visit the pop-up store
            </a>{" "}
            to see what&apos;s available.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="All Products">Current Drop</SectionHeading>

        {/* Category filter chips */}
        <div
          role="group"
          aria-label="Filter products by category"
          className="flex flex-wrap gap-2"
        >
          {categories.map((cat) => {
            const isActive = cat === activeCategory
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:text-primary"
                )}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Accessible live region to announce filter result count */}
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {filtered.length === 0
            ? "No products found."
            : `Showing ${Math.min(visibleCount, filtered.length)} of ${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <ShoppingBag
            size={32}
            className="text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            No products in this category yet.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {visible.map((product) => (
              <MerchProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div
              ref={sentinelRef}
              aria-hidden="true"
              className="flex justify-center py-4"
            >
              <span className="text-xs text-muted-foreground">
                Loading more&hellip;
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
