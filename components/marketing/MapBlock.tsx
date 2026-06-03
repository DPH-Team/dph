import Link from "next/link"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

export type MapBlockProps = {
  lat: number
  lng: number
  address: string
  zoom?: number
  markerLabel?: string
  /** "interactive" renders the styled CSS-only fallback (Phase 6 swaps in Mapbox GL when token is provided) */
  variant?: "placeholder" | "interactive"
  /** Phase 6: Mapbox GL JS token. When provided, swaps in a real map embed. Currently unused. */
  token?: string
  className?: string
}

export function MapBlock({
  address,
  lat,
  lng,
  markerLabel,
  variant = "placeholder",
  className,
}: MapBlockProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}&center=${lat},${lng}`

  if (variant === "interactive") {
    return (
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden border border-border bg-neutral-900",
          "min-h-[360px]",
          className
        )}
        aria-label={`Map showing location: ${address}`}
      >
        {/* Dotted-grid background */}
        <div className="absolute inset-0" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="oklch(0.310 0.005 286)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="oklch(0.198 0.003 286)" />
            <rect width="100%" height="100%" fill="url(#map-grid)" />
          </svg>
        </div>

        {/* Streets layer suggestion */}
        <div className="absolute inset-0 opacity-5" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="8" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="8" />
            <line x1="25%" y1="0" x2="25%" y2="100%" stroke="white" strokeWidth="3" />
            <line x1="75%" y1="0" x2="75%" y2="100%" stroke="white" strokeWidth="3" />
            <line x1="0" y1="30%" x2="100%" y2="30%" stroke="white" strokeWidth="3" />
            <line x1="0" y1="70%" x2="100%" y2="70%" stroke="white" strokeWidth="3" />
          </svg>
        </div>

        {/* Center copper pin marker */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center">
            <div className="size-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <MapPin size={20} className="text-brand-base" />
            </div>
            <div className="w-0.5 h-4 bg-primary mt-[-2px]" />
            <div className="size-2 rounded-full bg-primary opacity-50" />
          </div>
        </div>

        {/* Address card overlay — bottom-left */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-[280px]">
          <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-lg flex flex-col gap-2">
            {markerLabel && (
              <p className="font-display font-medium text-sm text-foreground">{markerLabel}</p>
            )}
            <p className="text-xs text-muted-foreground leading-snug">{address}</p>
            <Link
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-copper-hover transition-colors underline underline-offset-4 w-fit"
              aria-label={`Open ${address} in Google Maps`}
            >
              Open in Google Maps ↗
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl bg-card border border-border overflow-hidden",
        className
      )}
    >
      <div className="flex-1 flex items-center justify-center bg-neutral-900 min-h-[200px] relative">
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative flex flex-col items-center gap-2 text-center px-4">
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
            <MapPin size={24} className="text-primary" aria-hidden="true" />
          </div>
          {markerLabel && (
            <p className="text-sm font-medium text-foreground">{markerLabel}</p>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <p className="text-sm text-foreground font-medium leading-snug">{address}</p>
        <Link
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:text-copper-hover transition-colors underline underline-offset-4 w-fit"
        >
          Open in maps ↗
        </Link>
      </div>
    </div>
  )
}
