"use client"

import { useActionState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { subscribeToNewsletter, type NewsletterState } from "@/app/(public)/_actions/newsletter"
import { Turnstile, type TurnstileHandle } from "@/components/marketing/forms/Turnstile"

const initialState: NewsletterState = { ok: false }

export type NewsletterCTAProps = {
  variant?: "footer" | "section"
  className?: string
}

export function NewsletterCTA({ variant = "section", className }: NewsletterCTAProps) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initialState)
  const inputRef = useRef<HTMLInputElement>(null)
  const turnstileRef = useRef<TurnstileHandle | null>(null)

  useEffect(() => {
    if (state.ok && inputRef.current) {
      inputRef.current.value = ""
    }
    if (!state.ok && state.message) {
      turnstileRef.current?.reset()
    }
  }, [state.ok, state.message])

  const emailId = variant === "footer" ? "newsletter-footer-email" : "newsletter-section-email"
  const errorId = `${emailId}-error`

  if (state.ok) {
    return (
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "text-sm font-medium",
          variant === "footer" ? "text-muted-foreground" : "text-[--color-cream]"
        )}
      >
        {state.message ?? "You're on the list — see you soon."}
      </p>
    )
  }

  const handleAction = (formData: FormData) => {
    turnstileRef.current?.reset()
    return action(formData)
  }

  return (
    <form action={handleAction} className={cn("flex flex-col gap-3", className)} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={emailId} className="sr-only">
          Email address
        </Label>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Input
            ref={inputRef}
            id={emailId}
            name="email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            aria-required="true"
            aria-describedby={state.fieldErrors?.email ? errorId : undefined}
            aria-invalid={!!state.fieldErrors?.email}
            className="flex-1 min-w-0"
          />
          <Button
            type="submit"
            variant="default"
            aria-busy={pending}
            disabled={pending}
            className="shrink-0"
          >
            {pending ? (
              <span className="flex items-center gap-1.5">
                <span className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" aria-hidden="true" />
                <span>Subscribing…</span>
              </span>
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>
        {state.fieldErrors?.email && (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
        {state.message && !state.ok && !state.fieldErrors?.email && (
          <p role="alert" className="text-xs text-destructive">
            {state.message}
          </p>
        )}
      </div>

      {/* Bot protection — compact, blends into footer/section contexts */}
      <div className="[&_iframe]:scale-90 [&_iframe]:origin-left">
        <Turnstile handleRef={turnstileRef} />
      </div>
    </form>
  )
}
