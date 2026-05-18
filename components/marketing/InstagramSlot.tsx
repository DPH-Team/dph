import Link from "next/link"
import { cn } from "@/lib/utils"
import { INSTAGRAM_PROFILE_URL } from "@/lib/fixtures/instagram"
import type { IgPost } from "@/lib/fixtures/types"

export type InstagramSlotProps = {
  posts?: IgPost[]
  className?: string
}

function IgIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function InstagramSlot({ posts, className }: InstagramSlotProps) {
  const tiles = Array.from({ length: 6 })

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div
        className="grid grid-cols-3 sm:grid-cols-6 gap-2"
        aria-label="Instagram preview tiles"
      >
        {tiles.map((_, i) => (
          <Link
            key={i}
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "aspect-square rounded-lg bg-card border border-border",
              "flex items-center justify-center",
              "hover:border-[--color-copper]/50 hover:bg-card/80 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label={`View post ${i + 1} on Instagram`}
          >
            {posts && posts[i] ? (
              <span className="sr-only">{posts[i]!.alt}</span>
            ) : (
              <IgIcon className="size-8 text-[--color-packers-gold] opacity-60" />
            )}
          </Link>
        ))}
      </div>

      <div className="flex justify-center">
        <Link
          href={INSTAGRAM_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-[--color-copper-hover] transition-colors underline underline-offset-4"
        >
          <IgIcon className="size-4" />
          Open on Instagram ↗
        </Link>
      </div>
    </div>
  )
}
