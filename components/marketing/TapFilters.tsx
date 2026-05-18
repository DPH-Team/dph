"use client"

import { useState, useCallback, useId } from "react"
import { Search, ChevronDown, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tap } from "@/lib/fixtures/types"

export type TapFiltersProps = {
  taps: Tap[]
  onChange: (filtered: Tap[]) => void
  className?: string
}

function getUniqueStyles(taps: Tap[]): string[] {
  return Array.from(new Set(taps.map((t) => t.style))).sort()
}

function filterTaps(
  taps: Tap[],
  query: string,
  selectedStyles: string[],
  abvRange: [number, number],
): Tap[] {
  return taps.filter((tap) => {
    const matchesQuery =
      query === "" ||
      tap.name.toLowerCase().includes(query.toLowerCase()) ||
      tap.brewery.toLowerCase().includes(query.toLowerCase()) ||
      tap.style.toLowerCase().includes(query.toLowerCase())

    const matchesStyle =
      selectedStyles.length === 0 || selectedStyles.includes(tap.style)

    const matchesAbv = tap.abv >= abvRange[0] && tap.abv <= abvRange[1]

    return matchesQuery && matchesStyle && matchesAbv
  })
}

const GLOBAL_MIN_ABV = 0
const GLOBAL_MAX_ABV = 15

type AbvSliderProps = {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  id: string
}

function AbvSlider({ min, max, value, onChange, id }: AbvSliderProps) {
  const range = max - min
  const leftPct = ((value[0] - min) / range) * 100
  const rightPct = ((value[1] - min) / range) * 100

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseFloat(e.target.value)
    if (newMin <= value[1]) {
      onChange([newMin, value[1]])
    }
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseFloat(e.target.value)
    if (newMax >= value[0]) {
      onChange([value[0], newMax])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative h-5 flex items-center"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-border">
          {/* Active range highlight */}
          <div
            className="absolute h-full rounded-full bg-primary"
            style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
            aria-hidden="true"
          />
        </div>

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value[0]}
          onChange={handleMinChange}
          aria-label={`Minimum ABV: ${value[0].toFixed(1)}%`}
          className={cn(
            "absolute inset-x-0 w-full h-full appearance-none bg-transparent cursor-pointer",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:size-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-primary",
            "[&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-[--color-brand-base]",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:cursor-grab",
            "[&::-webkit-slider-thumb]:transition-colors",
            "[&::-webkit-slider-thumb]:hover:bg-[--color-copper-hover]",
            "[&::-moz-range-thumb]:size-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-primary",
            "[&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-[--color-brand-base]",
            "[&::-moz-range-thumb]:cursor-grab",
            "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring",
            "pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto",
          )}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value[1]}
          onChange={handleMaxChange}
          aria-label={`Maximum ABV: ${value[1].toFixed(1)}%`}
          className={cn(
            "absolute inset-x-0 w-full h-full appearance-none bg-transparent cursor-pointer",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:size-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-primary",
            "[&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-[--color-brand-base]",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-webkit-slider-thumb]:cursor-grab",
            "[&::-webkit-slider-thumb]:transition-colors",
            "[&::-webkit-slider-thumb]:hover:bg-[--color-copper-hover]",
            "[&::-moz-range-thumb]:size-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-primary",
            "[&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-[--color-brand-base]",
            "[&::-moz-range-thumb]:cursor-grab",
            "focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring",
            "pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto",
          )}
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span id={`${id}-label`} className="sr-only">ABV range</span>
        <span>{value[0].toFixed(1)}% ABV</span>
        <span>{value[1].toFixed(1)}% ABV</span>
      </div>
    </div>
  )
}

export function TapFilters({ taps, onChange, className }: TapFiltersProps) {
  const id = useId()
  const styles = getUniqueStyles(taps)

  const [query, setQuery] = useState("")
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [abvRange, setAbvRange] = useState<[number, number]>([GLOBAL_MIN_ABV, GLOBAL_MAX_ABV])
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false)

  const applyFilters = useCallback(
    (q: string, ss: string[], abv: [number, number]) => {
      onChange(filterTaps(taps, q, ss, abv))
    },
    [taps, onChange],
  )

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    applyFilters(q, selectedStyles, abvRange)
  }

  const toggleStyle = (style: string) => {
    const next = selectedStyles.includes(style)
      ? selectedStyles.filter((s) => s !== style)
      : [...selectedStyles, style]
    setSelectedStyles(next)
    applyFilters(query, next, abvRange)
  }

  const handleAbvChange = (range: [number, number]) => {
    setAbvRange(range)
    applyFilters(query, selectedStyles, range)
  }

  const clearAll = () => {
    setQuery("")
    setSelectedStyles([])
    setAbvRange([GLOBAL_MIN_ABV, GLOBAL_MAX_ABV])
    onChange(taps)
  }

  const hasActiveFilters =
    query !== "" ||
    selectedStyles.length > 0 ||
    abvRange[0] !== GLOBAL_MIN_ABV ||
    abvRange[1] !== GLOBAL_MAX_ABV

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 bg-card border border-border rounded-xl",
        className,
      )}
      role="search"
      aria-label="Filter taps"
    >
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search input */}
        <div className="flex-1 min-w-[180px] flex flex-col gap-1">
          <label htmlFor={`${id}-search`} className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder="Name, brewery, or style…"
              className={cn(
                "w-full h-10 pl-8 pr-3 rounded-[var(--radius-md)] border border-border bg-input text-sm",
                "text-foreground placeholder:text-muted-foreground",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
              )}
              aria-label="Search taps by name, brewery, or style"
            />
          </div>
        </div>

        {/* Style multi-select dropdown */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label htmlFor={`${id}-style-trigger`} className="text-xs font-medium text-muted-foreground">
            Style
          </label>
          <div className="relative">
            <button
              id={`${id}-style-trigger`}
              type="button"
              onClick={() => setStyleDropdownOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={styleDropdownOpen}
              aria-label={
                selectedStyles.length === 0
                  ? "Filter by style — all styles"
                  : `Filter by style — ${selectedStyles.length} selected`
              }
              className={cn(
                "flex w-full items-center justify-between gap-2 h-10 px-3 rounded-[var(--radius-md)]",
                "border border-border bg-input text-sm text-left",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
                styleDropdownOpen && "border-ring ring-2 ring-ring/35",
              )}
            >
              <span className={selectedStyles.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                {selectedStyles.length === 0
                  ? "All styles"
                  : selectedStyles.length === 1
                    ? selectedStyles[0]
                    : `${selectedStyles.length} selected`}
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "text-muted-foreground transition-transform duration-150 shrink-0 motion-reduce:transition-none",
                  styleDropdownOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {styleDropdownOpen && (
              <div
                role="listbox"
                aria-multiselectable="true"
                aria-label="Beer styles"
                className={cn(
                  "absolute top-full left-0 right-0 mt-1 z-50",
                  "bg-popover border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-popover)]",
                  "py-1 max-h-60 overflow-y-auto",
                )}
              >
                {styles.map((style) => {
                  const selected = selectedStyles.includes(style)
                  return (
                    <button
                      key={style}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggleStyle(style)}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-sm text-left",
                        "hover:bg-[oklch(0.235_0.004_286)] transition-colors",
                        selected ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "size-4 rounded border flex items-center justify-center shrink-0",
                          selected
                            ? "bg-primary border-primary"
                            : "border-border bg-transparent",
                        )}
                        aria-hidden="true"
                      >
                        {selected && <Check size={10} className="text-[--color-brand-base]" />}
                      </span>
                      {style}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Clear button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className={cn(
              "flex items-center gap-1.5 h-10 px-3 text-sm text-muted-foreground",
              "hover:text-foreground transition-colors rounded-[var(--radius-md)]",
              "border border-border hover:border-[oklch(0.400_0.006_80)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Clear all filters"
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {/* ABV range slider */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          ABV range
        </p>
        <AbvSlider
          id={`${id}-abv`}
          min={GLOBAL_MIN_ABV}
          max={GLOBAL_MAX_ABV}
          value={abvRange}
          onChange={handleAbvChange}
        />
      </div>
    </div>
  )
}
