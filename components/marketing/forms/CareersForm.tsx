"use client"

import { useActionState, useState, useRef } from "react"
import { Loader2, CheckCircle, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"
import { submitCareerApplication } from "@/app/(public)/_actions/careers"
import { FormField } from "./FormField"
import type { Posting } from "@/lib/fixtures/types"

export type CareersFormProps = {
  positions: Posting[]
  defaultPositionId?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx"
const MAX_FILE_BYTES = 5 * 1024 * 1024

export function CareersForm({ positions, defaultPositionId }: CareersFormProps) {
  const [state, formAction, isPending] = useActionState(submitCareerApplication, null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fieldError = (field: string) => {
    if (!state || state.ok) return undefined
    return state.fieldErrors?.[field]?.[0]
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFileError(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setFileError("File must be smaller than 5 MB")
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setSelectedFile(file)
  }

  if (state?.ok) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="flex flex-col items-center gap-4 py-12 text-center"
      >
        <CheckCircle size={48} className="text-primary" aria-hidden="true" />
        <p className="text-lg font-medium text-foreground">{state.message}</p>
      </div>
    )
  }

  const openPositions = positions.filter((p) => p.isOpen)

  return (
    <form action={formAction} noValidate aria-label="Career application form">
      <div className="flex flex-col gap-5">
        {/* Position */}
        <FormField
          label="Position"
          htmlFor="career-position"
          error={fieldError("positionId")}
          required
        >
          <div className="relative">
            <select
              id="career-position"
              name="positionId"
              defaultValue={defaultPositionId ?? ""}
              required
              aria-required="true"
              aria-invalid={fieldError("positionId") ? "true" : undefined}
              aria-describedby={fieldError("positionId") ? "career-position-error" : undefined}
              className={cn(
                "w-full h-10 px-3 pr-8 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm text-foreground appearance-none",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
                fieldError("positionId") && "border-destructive",
              )}
            >
              <option value="" disabled>
                Select a position…
              </option>
              {openPositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.department}
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

        {/* Name + Email row */}
        <div className="grid sm:grid-cols-2 gap-5">
          <FormField
            label="Full name"
            htmlFor="career-name"
            error={fieldError("name")}
            required
          >
            <input
              id="career-name"
              name="name"
              type="text"
              required
              aria-required="true"
              aria-invalid={fieldError("name") ? "true" : undefined}
              aria-describedby={fieldError("name") ? "career-name-error" : undefined}
              autoComplete="name"
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

          <FormField
            label="Email"
            htmlFor="career-email"
            error={fieldError("email")}
            required
          >
            <input
              id="career-email"
              name="email"
              type="email"
              required
              aria-required="true"
              aria-invalid={fieldError("email") ? "true" : undefined}
              aria-describedby={fieldError("email") ? "career-email-error" : undefined}
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
        </div>

        {/* Phone + Link row */}
        <div className="grid sm:grid-cols-2 gap-5">
          <FormField
            label="Phone"
            htmlFor="career-phone"
            error={fieldError("phone")}
            required
          >
            <input
              id="career-phone"
              name="phone"
              type="tel"
              required
              aria-required="true"
              aria-invalid={fieldError("phone") ? "true" : undefined}
              aria-describedby={fieldError("phone") ? "career-phone-error" : undefined}
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

          <FormField
            label="Portfolio / LinkedIn"
            htmlFor="career-link"
            error={fieldError("link")}
            description="Optional"
          >
            <input
              id="career-link"
              name="link"
              type="url"
              aria-invalid={fieldError("link") ? "true" : undefined}
              aria-describedby={[
                "career-link-desc",
                fieldError("link") ? "career-link-error" : undefined,
              ]
                .filter(Boolean)
                .join(" ")}
              autoComplete="url"
              placeholder="https://…"
              className={cn(
                "w-full h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
                "outline-none transition-colors",
                fieldError("link") && "border-destructive",
              )}
            />
          </FormField>
        </div>

        {/* Availability */}
        <FormField
          label="Availability"
          htmlFor="career-availability"
          error={fieldError("availability")}
          required
          description="When can you work? Weekends, evenings, specific days?"
        >
          <textarea
            id="career-availability"
            name="availability"
            required
            aria-required="true"
            aria-invalid={fieldError("availability") ? "true" : undefined}
            aria-describedby={[
              "career-availability-desc",
              fieldError("availability") ? "career-availability-error" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
            minLength={5}
            maxLength={500}
            rows={3}
            placeholder="E.g., weekends and Friday evenings, open to full-time…"
            className={cn(
              "w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-input",
              "text-sm text-foreground placeholder:text-muted-foreground resize-y",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
              fieldError("availability") && "border-destructive",
            )}
          />
        </FormField>

        {/* Cover letter (optional) */}
        <FormField
          label="Cover letter"
          htmlFor="career-cover"
          error={fieldError("coverLetter")}
          description="Optional — tell us what makes you a great fit"
        >
          <textarea
            id="career-cover"
            name="coverLetter"
            aria-invalid={fieldError("coverLetter") ? "true" : undefined}
            aria-describedby={[
              "career-cover-desc",
              fieldError("coverLetter") ? "career-cover-error" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
            maxLength={2000}
            rows={5}
            placeholder="Optional cover letter…"
            className={cn(
              "w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-input",
              "text-sm text-foreground placeholder:text-muted-foreground resize-y",
              "hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
              "outline-none transition-colors",
              fieldError("coverLetter") && "border-destructive",
            )}
          />
        </FormField>

        {/* Resume file input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="career-resume"
            className="text-sm font-medium text-foreground flex items-center gap-1"
          >
            Resume
            <span className="text-primary" aria-hidden="true">*</span>
          </label>
          <p className="text-xs text-muted-foreground" id="career-resume-desc">
            PDF, DOC, or DOCX — max 5 MB
          </p>

          <label
            htmlFor="career-resume"
            className={cn(
              "flex items-center gap-3 h-10 px-3 rounded-[var(--radius-md)] border border-border bg-input cursor-pointer",
              "hover:border-[oklch(0.400_0.006_80)] transition-colors",
              "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/35",
              (fileError || fieldError("resume")) && "border-destructive",
            )}
          >
            <Paperclip size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <span className={cn("text-sm", selectedFile ? "text-foreground" : "text-muted-foreground")}>
              {selectedFile ? selectedFile.name : "Choose file…"}
            </span>
            {selectedFile && (
              <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
            <input
              id="career-resume"
              name="resume"
              type="file"
              accept={ACCEPTED_TYPES}
              required
              aria-required="true"
              aria-invalid={fileError || fieldError("resume") ? "true" : undefined}
              aria-describedby={[
                "career-resume-desc",
                fileError || fieldError("resume") ? "career-resume-error" : undefined,
              ]
                .filter(Boolean)
                .join(" ")}
              onChange={handleFileChange}
              ref={fileInputRef}
              className="sr-only"
            />
          </label>

          {(fileError || fieldError("resume")) && (
            <p
              id="career-resume-error"
              role="alert"
              aria-live="polite"
              className="text-xs text-destructive"
            >
              {fileError ?? fieldError("resume")}
            </p>
          )}
        </div>

        {/* Consent */}
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-3">
            <input
              id="career-consent"
              name="consent"
              type="checkbox"
              value="true"
              required
              aria-required="true"
              aria-invalid={fieldError("consent") ? "true" : undefined}
              aria-describedby={fieldError("consent") ? "career-consent-error" : undefined}
              className={cn(
                "mt-0.5 size-4 rounded border border-border bg-input shrink-0 cursor-pointer",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                "accent-primary",
              )}
            />
            <label
              htmlFor="career-consent"
              className="text-sm text-muted-foreground leading-snug cursor-pointer"
            >
              I&apos;m okay being contacted about this application
              <span className="text-primary ml-1" aria-hidden="true">*</span>
            </label>
          </div>
          {fieldError("consent") && (
            <p
              id="career-consent-error"
              role="alert"
              aria-live="polite"
              className="text-xs text-destructive"
            >
              {fieldError("consent")}
            </p>
          )}
        </div>

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
          aria-label={isPending ? "Submitting your application…" : "Submit application"}
          className={cn(
            "flex items-center justify-center gap-2",
            "w-full sm:w-auto sm:px-8",
            "h-11 px-6 rounded-[var(--radius-md)]",
            "bg-primary text-[--color-brand-base] font-medium text-sm",
            "hover:bg-[--color-copper-hover] active:bg-[--color-copper-active]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        >
          {isPending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {isPending ? "Submitting…" : "Apply now"}
        </button>
      </div>
    </form>
  )
}
