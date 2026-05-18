"use client"

import { useEffect, useCallback } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import type { GalleryImage } from "@/lib/fixtures/types"

export type LightboxProps = {
  images: GalleryImage[]
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onIndexChange: (index: number) => void
}

export function Lightbox({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: LightboxProps) {
  const image = images[index]
  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1)
  }, [hasNext, index, onIndexChange])

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1)
  }, [hasPrev, index, onIndexChange])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, goNext, goPrev])

  if (!image) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          className={cn(
            "fixed inset-0 z-[61] flex items-center justify-center p-4",
            "outline-none"
          )}
          aria-label={image.alt}
        >
          <div className="relative w-full max-w-5xl max-h-[90svh] flex flex-col gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className={cn(
                "absolute -top-10 right-0 size-8 rounded-full",
                "flex items-center justify-center",
                "bg-card/80 text-foreground hover:text-primary transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              aria-label="Close lightbox"
            >
              <X size={16} aria-hidden="true" />
            </button>

            <div className="relative w-full flex-1 min-h-0 rounded-xl overflow-hidden bg-card">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                className="w-full h-full object-contain max-h-[75svh]"
                priority
              />
            </div>

            {image.caption && (
              <p className="text-sm text-muted-foreground text-center px-4">
                {image.caption}
              </p>
            )}

            <div className="flex items-center justify-between px-1">
              <button
                onClick={goPrev}
                disabled={!hasPrev}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  "text-muted-foreground hover:text-foreground transition-colors",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                )}
                aria-label="Previous image"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </button>

              <span className="text-xs text-muted-foreground tabular-nums">
                {index + 1} / {images.length}
              </span>

              <button
                onClick={goNext}
                disabled={!hasNext}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  "text-muted-foreground hover:text-foreground transition-colors",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                )}
                aria-label="Next image"
              >
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
