"use client"

import { useActionState, useRef, useState } from "react"
import { Loader2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { submitInquiry } from "@/app/(public)/_actions/inquiries"
import { FormField } from "./FormField"
import { Turnstile, type TurnstileHandle } from "./Turnstile"

const INQUIRY_TYPES = [
  { value: "reservation", label: "Reservation" },
  { value: "private-event", label: "Private Event" },
  { value: "press", label: "Press" },
  { value: "general", label: "General Inquiry" },
] as const

type InquiryType = (typeof INQUIRY_TYPES)[number]["value"]

export type InquiryFormProps = {
  defaultType?: InquiryType
}

export function InquiryForm({ defaultType = "reservation" }: InquiryFormProps) {
  const [state, formAction, isPending] = useActionState(submitInquiry, null)
  const turnstileRef = useRef<TurnstileHandle | null>(null)
  const [type, setType] = useState(defaultType)
  const requiresBooking = type === "reservation" || type === "private-event"

  const fieldError = (field: string) => {
    if (!state || state.ok) return undefined
    return state.fieldErrors?.[field]?.[0]
  }

  const handleFormAction = (formData: FormData) => {
    turnstileRef.current?.reset()
    return formAction(formData)
  }

  if (state?.ok) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center gap-4 py-12 text-center"
      >
        <CheckCircle
          size={48}
          className="text-primary"
          aria-hidden="true"
        />
        <p className="text-lg font-medium text-foreground">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={handleFormAction} noValidate aria-label="Inquiry form">
      <div className="flex flex-col gap-4">
        {/* Inquiry type selector */}
        <FormField
          label="Type of inquiry"
          htmlFor="inquiry-type"
          error={fieldError("type")}
          required
        >
          <div className="relative">
            <select
              id="inquiry-type"
              name="type"
              defaultValue={defaultType}
              onChange={(e) => setType(e.target.value)}
              required
              aria-required="true"
              aria-invalid={fieldError("type") ? "true" : undefined}
              aria-describedby={fieldError("type") ? "inquiry-type-error" : undefined}
              className={cn(
                "w-full h-10 px-3 pr-8 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm text-foreground appearance-none",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
                fieldError("type") && "border-destructive",
              )}
            >
              {INQUIRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </FormField>

        {/* Name */}
        <FormField
          label="Name"
          htmlFor="inquiry-name"
          error={fieldError("name")}
          required
        >
          <input
            id="inquiry-name"
            name="name"
            type="text"
            required
            aria-required="true"
            aria-invalid={fieldError("name") ? "true" : undefined}
            aria-describedby={fieldError("name") ? "inquiry-name-error" : undefined}
            autoComplete="name"
            minLength={2}
            maxLength={80}
            placeholder="Your full name"
            className={cn(
              "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
              fieldError("name") && "border-destructive",
            )}
          />
        </FormField>

        {/* Email */}
        <FormField
          label="Email"
          htmlFor="inquiry-email"
          error={fieldError("email")}
          required
        >
          <input
            id="inquiry-email"
            name="email"
            type="email"
            required
            aria-required="true"
            aria-invalid={fieldError("email") ? "true" : undefined}
            aria-describedby={fieldError("email") ? "inquiry-email-error" : undefined}
            autoComplete="email"
            placeholder="you@example.com"
            className={cn(
              "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
              fieldError("email") && "border-destructive",
            )}
          />
        </FormField>

        {/* Phone — always required */}
        <FormField
          label="Phone"
          htmlFor="inquiry-phone"
          error={fieldError("phone")}
          description="We'll only use this to follow up on your inquiry."
          required
        >
          <input
            id="inquiry-phone"
            name="phone"
            type="tel"
            required
            aria-required="true"
            aria-invalid={fieldError("phone") ? "true" : undefined}
            aria-describedby={[
              "inquiry-phone-desc",
              fieldError("phone") ? "inquiry-phone-error" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
            autoComplete="tel"
            placeholder="(920) 555-0100"
            className={cn(
              "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
              fieldError("phone") && "border-destructive",
            )}
          />
        </FormField>

        {/* Party size (reservation only) — always rendered for SSR, visually hidden */}
        <input type="hidden" name="partySize" id="inquiry-party-size-hidden" value="" />
        <div className={cn("flex flex-col gap-1.5")}>
          <label
            htmlFor="inquiry-party-size"
            className="text-sm font-medium text-foreground flex items-center gap-1"
          >
            Party size
            {requiresBooking && <span className="text-primary" aria-hidden="true">*</span>}
            <span className="text-xs text-muted-foreground font-normal">(reservations &amp; private events)</span>
          </label>
          <input
            id="inquiry-party-size"
            name="partySize"
            type="number"
            min={1}
            max={200}
            aria-required={requiresBooking ? "true" : undefined}
            aria-invalid={fieldError("partySize") ? "true" : undefined}
            aria-describedby={fieldError("partySize") ? "inquiry-party-size-error" : undefined}
            placeholder="1–200 guests"
            className={cn(
              "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
              fieldError("partySize") && "border-destructive",
            )}
          />
          {fieldError("partySize") && (
            <p
              id="inquiry-party-size-error"
              role="alert"
              aria-live="polite"
              className="text-xs text-destructive"
            >
              {fieldError("partySize")}
            </p>
          )}
        </div>

        {/* Seating preference (reservations & private events) */}
        <div className={cn("flex flex-col gap-1.5")}>
          <label
            htmlFor="inquiry-seating"
            className="text-sm font-medium text-foreground flex items-center gap-1"
          >
            Seating preference
            {requiresBooking && <span className="text-primary" aria-hidden="true">*</span>}
            <span className="text-xs text-muted-foreground font-normal">(reservations &amp; private events)</span>
          </label>
          <div className="relative">
            <select
              id="inquiry-seating"
              name="seatingPreference"
              defaultValue=""
              aria-required={requiresBooking ? "true" : undefined}
              aria-invalid={fieldError("seatingPreference") ? "true" : undefined}
              aria-describedby={fieldError("seatingPreference") ? "inquiry-seating-error" : undefined}
              className={cn(
                "w-full h-10 px-3 pr-8 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm text-foreground appearance-none",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
                fieldError("seatingPreference") && "border-destructive",
              )}
            >
              <option value="">No preference</option>
              <option value="high_top">High-top</option>
              <option value="low_top">Low-top</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          {fieldError("seatingPreference") && (
            <p
              id="inquiry-seating-error"
              role="alert"
              aria-live="polite"
              className="text-xs text-destructive"
            >
              {fieldError("seatingPreference")}
            </p>
          )}
        </div>

        {/* When fieldset: preferred date + time */}
        <fieldset className="flex flex-col gap-4 border-0 p-0 m-0">
          <legend className="text-sm font-medium text-foreground mb-1">
            When
            <span className="text-xs text-muted-foreground font-normal ml-2">(reservations &amp; private events)</span>
          </legend>

          <FormField
            label="Preferred date"
            htmlFor="inquiry-date"
            error={fieldError("preferredDate")}
          >
            <input
              id="inquiry-date"
              name="preferredDate"
              type="date"
              aria-invalid={fieldError("preferredDate") ? "true" : undefined}
              aria-describedby={fieldError("preferredDate") ? "inquiry-date-error" : undefined}
              className={cn(
                "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm text-foreground",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
                "[color-scheme:dark]",
                fieldError("preferredDate") && "border-destructive",
              )}
            />
          </FormField>

          <FormField
            label="Preferred time"
            htmlFor="inquiry-time"
            error={fieldError("preferredTime")}
          >
            <input
              id="inquiry-time"
              name="preferredTime"
              type="time"
              aria-invalid={fieldError("preferredTime") ? "true" : undefined}
              aria-describedby={fieldError("preferredTime") ? "inquiry-time-error" : undefined}
              className={cn(
                "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm text-foreground",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
                "[color-scheme:dark]",
                fieldError("preferredTime") && "border-destructive",
              )}
            />
          </FormField>
        </fieldset>

        {/* Message */}
        <FormField
          label="Message"
          htmlFor="inquiry-message"
          error={fieldError("message")}
          required
        >
          <textarea
            id="inquiry-message"
            name="message"
            required
            aria-required="true"
            aria-invalid={fieldError("message") ? "true" : undefined}
            aria-describedby={fieldError("message") ? "inquiry-message-error" : undefined}
            minLength={10}
            maxLength={2000}
            rows={5}
            placeholder="Tell us about your inquiry…"
            className={cn(
              "w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-input",
              "text-sm text-foreground placeholder:text-muted-foreground resize-y",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
              fieldError("message") && "border-destructive",
            )}
          />
        </FormField>

        {/* Bot protection */}
        <Turnstile handleRef={turnstileRef} />

        {/* General error */}
        {state && !state.ok && !state.fieldErrors && state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
          aria-label={isPending ? "Sending your inquiry…" : "Send inquiry"}
          className={cn(
            "flex items-center justify-center gap-2",
            "w-full sm:w-auto sm:px-8",
            "h-11 px-6 rounded-[var(--radius-md)]",
            "bg-primary text-brand-base font-medium text-sm",
            "hover:bg-copper-hover active:bg-copper-active",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed",
          )}
        >
          {isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {isPending ? "Sending…" : "Send inquiry"}
        </button>
      </div>
    </form>
  )
}
