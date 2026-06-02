"use client"

import { useEffect, useRef, useCallback, useId } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          theme?: "light" | "dark" | "auto"
          callback?: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
          "response-field"?: boolean
          "response-field-name"?: string
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

const DEV_ALWAYS_PASS_SITEKEY = "1x00000000000000000000AA"

export type TurnstileHandle = {
  reset: () => void
}

export type TurnstileProps = {
  onToken?: (token: string) => void
  onExpire?: () => void
  onError?: () => void
  handleRef?: React.RefObject<TurnstileHandle | null>
}

export function Turnstile({ onToken, onExpire, onError, handleRef }: TurnstileProps) {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEV_ALWAYS_PASS_SITEKEY

  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const containerId = useId()

  const render = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return
    if (widgetIdRef.current !== null) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      "response-field": true,
      "response-field-name": "cf-turnstile-response",
      callback: (token: string) => {
        onToken?.(token)
      },
      "expired-callback": () => {
        onExpire?.()
      },
      "error-callback": () => {
        onError?.()
      },
    })
  }, [siteKey, onToken, onExpire, onError])

  useEffect(() => {
    if (window.turnstile) {
      render()
      return
    }

    const prev = window.onTurnstileLoad
    window.onTurnstileLoad = () => {
      prev?.()
      render()
    }

    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script")
      script.id = "cf-turnstile-script"
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    return () => {
      if (window.onTurnstileLoad === render) {
        window.onTurnstileLoad = prev
      }
    }
  }, [render])

  useEffect(() => {
    if (handleRef) {
      handleRef.current = {
        reset: () => {
          if (widgetIdRef.current !== null && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        },
      }
    }
  }, [handleRef])

  useEffect(() => {
    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // widget may already be gone on hot-reload
        }
        widgetIdRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      id={containerId}
      aria-label="Bot protection challenge"
      className="mt-1"
    />
  )
}
