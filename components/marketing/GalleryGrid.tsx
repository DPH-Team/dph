"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { BLUR_CHARCOAL } from "@/lib/blur"
import type { GalleryImage } from "@/lib/fixtures/types"
import type { LightboxProps } from "@/components/marketing/Lightbox"

const Lightbox = dynamic<LightboxProps>(
  () => import("@/components/marketing/Lightbox").then((m) => m.Lightbox),
  { ssr: false }
)

export type GalleryGridProps = {
  images: GalleryImage[]
  className?: string
}

export function GalleryGrid({ images, className }: GalleryGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  function openAt(index: number) {
    setActiveIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          "columns-1 sm:columns-2 lg:columns-3 gap-2",
          className
        )}
        role="list"
        aria-label="Gallery images"
      >
        {images.map((image, index) => (
          <div key={image.id} className="mb-2 break-inside-avoid" role="listitem">
            <button
              onClick={() => openAt(index)}
              className={cn(
                "relative w-full overflow-hidden rounded-lg bg-card border border-border",
                "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "hover:border-[--color-copper]/40 transition-colors"
              )}
              aria-label={image.alt}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={BLUR_CHARCOAL}
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {image.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-[--color-cream] line-clamp-2">
                    {image.caption}
                  </p>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      <Lightbox
        images={images}
        index={activeIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onIndexChange={setActiveIndex}
      />
    </>
  )
}
