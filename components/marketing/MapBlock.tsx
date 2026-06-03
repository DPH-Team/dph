import Image from "next/image"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { BLUR_CHARCOAL } from "@/lib/blur"

export type MapBlockProps = {
  lat: number
  lng: number
  address: string
  zoom?: number
  markerLabel?: string
  /** "interactive" renders at min-h-[360px]; "placeholder" renders at min-h-[200px].
   *  When MAPBOX_TOKEN is set both variants show a real Mapbox Static Images tile.
   *  When MAPBOX_TOKEN is absent both variants fall back to the original SVG placeholder. */
  variant?: "placeholder" | "interactive"
  /** Deprecated — token is now read from process.env.MAPBOX_TOKEN (server-only).
   *  The owner should configure a Mapbox PUBLIC token (pk.*) URL-restricted to the
   *  site domain — the token appears in the image src and is therefore not secret. */
  token?: string
  className?: string
}

/**
 * Build a Mapbox Static Images API URL.
 *
 * Style:  mapbox/dark-v11  (matches DPH dark theme)
 * Pin:    large pin, copper brand color c97b4a (no #), placed at the venue coords
 * Size:   640×360 @2x (renders at 1280×720 physical pixels)
 * Zoom:   defaults to 15 (street-level); caller may override via the `zoom` prop
 *
 * IMPORTANT: the token ends up in the image src and is visible to end-users.
 * Always use a Mapbox PUBLIC token (pk.*) that is URL-restricted to the site domain.
 */
function buildMapboxUrl(lat: number, lng: number, zoom: number, token: string): string {
  const pin = `pin-l+c97b4a(${lng},${lat})`
  const center = `${lng},${lat},${zoom},0`
  const size = "640x360@2x"
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${pin}/${center}/${size}?access_token=${token}`
}

export function MapBlock({
  address,
  lat,
  lng,
  zoom = 15,
  markerLabel,
  variant = "placeholder",
  className,
}: MapBlockProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}&center=${lat},${lng}`

  // Read the token server-side only. Never passed to the client.
  const mapboxToken = process.env.MAPBOX_TOKEN
  const mapImageUrl = mapboxToken ? buildMapboxUrl(lat, lng, zoom, mapboxToken) : null

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
        {mapImageUrl ? (
          /* --- Token present: real Mapbox static image --- */
          <Image
            src={mapImageUrl}
            alt={`Map showing ${address}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 800px"
            className="object-cover"
            placeholder="blur"
            blurDataURL={BLUR_CHARCOAL}
          />
        ) : (
          /* --- No token: existing SVG placeholder --- */
          <>
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
          </>
        )}

        {/* Address card overlay — bottom-left (always visible) */}
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

  // variant === "placeholder"
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl bg-card border border-border overflow-hidden",
        className
      )}
    >
      {mapImageUrl ? (
        /* --- Token present: real Mapbox static image --- */
        <div className="relative flex-1 min-h-[200px]">
          <Image
            src={mapImageUrl}
            alt={`Map showing ${address}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px"
            className="object-cover"
            placeholder="blur"
            blurDataURL={BLUR_CHARCOAL}
          />
        </div>
      ) : (
        /* --- No token: existing SVG placeholder --- */
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
      )}

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
