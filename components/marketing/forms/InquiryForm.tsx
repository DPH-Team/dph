"use client"

import { useActionState, useEffect, useRef, useState } from "react"
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

type FormValues = {
  type: InquiryType
  name: string
  email: string
  phone: string
  partySize: string
  seatingPreference: string
  preferredDate: string
  preferredTime: string
  message: string
}

// Field order matches visual layout, used to focus/scroll to the first
// invalid field after a failed submit.
const FIELD_ORDER: { name: keyof FormValues; id: string }[] = [
  { name: "type", id: "inquiry-type" },
  { name: "name", id: "inquiry-name" },
  { name: "email", id: "inquiry-email" },
  { name: "phone", id: "inquiry-phone" },
  { name: "partySize", id: "inquiry-party-size" },
  { name: "seatingPreference", id: "inquiry-seating" },
  { name: "preferredDate", id: "inquiry-date" },
  { name: "preferredTime", id: "inquiry-time" },
  { name: "message", id: "inquiry-message" },
]

export function InquiryForm({ defaultType = "reservation" }: InquiryFormProps) {
  const [state, formAction, isPending] = useActionState(submitInquiry, null)
  const turnstileRef = useRef<TurnstileHandle | null>(null)

  // Values are held in React state (controlled inputs) rather than relying on
  // the DOM/defaultValue. React 19 automatically resets uncontrolled <form>
  // fields once a form action settles — including on a *failed* submit — so
  // uncontrolled fields would wipe user input on every validation error.
  // Controlled fields are exempt from that automatic reset.
  const [values, setValues] = useState<FormValues>({
    type: defaultType,
    name: "",
    email: "",
    phone: "",
    partySize: "",
    seatingPreference: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  })

  const requiresBooking = values.type === "reservation" || values.type === "private-event"

  const setField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const fieldError = (field: string) => {
    if (!state || state.ok) return undefined
    return state.fieldErrors?.[field]?.[0]
  }

  const handleFormAction = (formData: FormData) => {
    turnstileRef.current?.reset()
    return formAction(formData)
  }

  // After a failed submit, move focus to (and scroll to) the first invalid
  // field so the user immediately sees what needs attention.
  useEffect(() => {
    if (!state || state.ok || !state.fieldErrors) return
    const firstInvalid = FIELD_ORDER.find(({ name }) => state.fieldErrors?.[name]?.length)
    if (!firstInvalid) return
    const el = document.getElementById(firstInvalid.id)
    if (!el) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" })
    el.focus({ preventScroll: true })
  }, [state])

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
              value={values.type}
              onChange={(e) => setField("type", e.target.value as InquiryType)}
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
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
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
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
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
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
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
            max={150}
            value={values.partySize}
            onChange={(e) => setField("partySize", e.target.value)}
            aria-required={requiresBooking ? "true" : undefined}
            aria-invalid={fieldError("partySize") ? "true" : undefined}
            aria-describedby={fieldError("partySize") ? "inquiry-party-size-error" : undefined}
            placeholder="1–150 guests"
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

        {/* Seating preference (reservations & private events) — "No preference"
            is a valid default; this field is never actually required. */}
        <div className={cn("flex flex-col gap-1.5")}>
          <label
            htmlFor="inquiry-seating"
            className="text-sm font-medium text-foreground flex items-center gap-1"
          >
            Seating preference
            <span className="text-xs text-muted-foreground font-normal">(reservations &amp; private events)</span>
          </label>
          <div className="relative">
            <select
              id="inquiry-seating"
              name="seatingPreference"
              value={values.seatingPreference}
              onChange={(e) => setField("seatingPreference", e.target.value)}
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
            required={requiresBooking}
          >
            <input
              id="inquiry-date"
              name="preferredDate"
              type="date"
              value={values.preferredDate}
              onChange={(e) => setField("preferredDate", e.target.value)}
              aria-required={requiresBooking ? "true" : undefined}
              aria-invalid={fieldError("preferredDate") ? "true" : undefined}
              aria-describedby={fieldError("preferredDate") ? "inquiry-date-error" : undefined}
              className={cn(
                "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm",
                // Empty date/time inputs render their mm/dd/yyyy placeholder
                // text using the input's `color`, so without this it reads
                // identically to a real selected value. Dim it until a value
                // is actually chosen.
                values.preferredDate ? "text-foreground" : "text-muted-foreground",
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
            required={requiresBooking}
          >
            <input
              id="inquiry-time"
              name="preferredTime"
              type="time"
              value={values.preferredTime}
              onChange={(e) => setField("preferredTime", e.target.value)}
              aria-required={requiresBooking ? "true" : undefined}
              aria-invalid={fieldError("preferredTime") ? "true" : undefined}
              aria-describedby={fieldError("preferredTime") ? "inquiry-time-error" : undefined}
              className={cn(
                "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm",
                values.preferredTime ? "text-foreground" : "text-muted-foreground",
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
            value={values.message}
            onChange={(e) => setField("message", e.target.value)}
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
