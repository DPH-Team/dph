"use client"

import { useState, useEffect, useRef } from "react"
import { Share2, Link2, Check } from "lucide-react"

export type EventShareRowProps = {
  shareUrl: string
  title: string
}

export function EventShareRow({ shareUrl, title }: EventShareRowProps) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const check = () =>
      setCanShare(typeof navigator !== "undefined" && !!navigator.share)
    check()
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const el = document.createElement("textarea")
        el.value = shareUrl
        el.setAttribute("readonly", "")
        el.style.position = "absolute"
        el.style.left = "-9999px"
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
      }
      setCopied(true)
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently ignore clipboard errors
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url: shareUrl })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
    }
  }

  const linkClass =
    "text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Share
      </h3>
      <div className="flex flex-col gap-2">
        {/* Row 1 — social links */}
        <div className="flex items-center gap-3">
          <Share2 size={14} className="text-muted-foreground" aria-hidden="true" />
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="Share on X (Twitter)"
          >
            X / Twitter
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="Share on Facebook"
          >
            Facebook
          </a>
        </div>

        {/* Row 2 — copy + native share */}
        <div className="flex items-center gap-3">
          <div role="status" aria-live="polite" aria-atomic="true">
            <button
              type="button"
              onClick={handleCopy}
              className={`${linkClass} flex items-center gap-1.5`}
              aria-label={copied ? "Link copied to clipboard" : "Copy link to clipboard"}
            >
              {copied ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <Link2 size={13} aria-hidden="true" />
              )}
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>
          </div>

          {canShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className={`${linkClass} flex items-center gap-1.5`}
              aria-label="Open native share dialog"
            >
              <Share2 size={13} aria-hidden="true" />
              <span>Share…</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
