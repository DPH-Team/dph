"use client"

import { useActionState, useState, useRef, useCallback } from "react"
import { Loader2, CheckCircle, Paperclip, UploadCloud, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { submitCareerApplication } from "@/app/(public)/_actions/careers"
import { FormField } from "./FormField"
import { Turnstile, type TurnstileHandle } from "./Turnstile"
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

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done"; path: string }
  | { status: "error"; message: string }

export function CareersForm({ positions, defaultPositionId }: CareersFormProps) {
  const [state, formAction, isPending] = useActionState(submitCareerApplication, null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const turnstileRef = useRef<TurnstileHandle | null>(null)
  const turnstileTokenRef = useRef<string | null>(null)
  const resumePathRef = useRef<string>("")

  const fieldError = (field: string) => {
    if (!state || state.ok) return undefined
    return state.fieldErrors?.[field]?.[0]
  }

  const handleTurnstileToken = useCallback((token: string) => {
    turnstileTokenRef.current = token
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    turnstileTokenRef.current = null
  }, [])

  const handleTurnstileError = useCallback(() => {
    turnstileTokenRef.current = null
  }, [])

  const uploadResume = useCallback(async (file: File): Promise<string | null> => {
    const token = turnstileTokenRef.current
    if (!token) {
      setUploadState({ status: "error", message: "Bot verification not ready — please wait a moment and try again." })
      return null
    }

    setUploadState({ status: "uploading", progress: 0 })

    let signedUrl: string
    let path: string
    try {
      const res = await fetch("/api/uploads/sign-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          "cf-turnstile-response": token,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { signedUrl: string; token: string; path: string }
      signedUrl = data.signedUrl
      path = data.path
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get upload URL."
      setUploadState({ status: "error", message: msg })
      // Token consumed — reset so user can retry with a fresh one
      turnstileRef.current?.reset()
      turnstileTokenRef.current = null
      return null
    }

    return new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadState({
            status: "uploading",
            progress: Math.round((e.loaded / e.total) * 100),
          })
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadState({ status: "done", path })
          resumePathRef.current = path
          // Token consumed for sign-resume; reset so submit gets a fresh one
          turnstileRef.current?.reset()
          turnstileTokenRef.current = null
          resolve(path)
        } else {
          const msg = `Upload failed: HTTP ${xhr.status}`
          setUploadState({ status: "error", message: msg })
          turnstileRef.current?.reset()
          turnstileTokenRef.current = null
          resolve(null)
        }
      }

      xhr.onerror = () => {
        const msg = "Network error during upload."
        setUploadState({ status: "error", message: msg })
        turnstileRef.current?.reset()
        turnstileTokenRef.current = null
        resolve(null)
      }

      xhr.open("PUT", signedUrl)
      xhr.setRequestHeader("Content-Type", file.type)
      xhr.setRequestHeader("x-upsert", "true")
      xhr.send(file)
    })
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null
      setFileError(null)
      setUploadState({ status: "idle" })
      resumePathRef.current = ""

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
      await uploadResume(file)
    },
    [uploadResume],
  )

  const handleFormAction = (formData: FormData) => {
    if (!selectedFile) {
      setFileError("Please attach your resume")
      return
    }

    if (uploadState.status === "uploading") {
      setFileError("Please wait for the upload to finish")
      return
    }

    if (uploadState.status === "error") {
      setFileError("Resume upload failed — please try again")
      return
    }

    if (uploadState.status !== "done" || !resumePathRef.current) {
      setFileError("Resume upload is incomplete — please re-attach your file")
      return
    }

    formData.set("resumePath", resumePathRef.current)
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
        <CheckCircle size={48} className="text-primary" aria-hidden="true" />
        <p className="text-lg font-medium text-foreground">{state.message}</p>
      </div>
    )
  }

  const openPositions = positions.filter((p) => p.isOpen)
  const isUploadPending = uploadState.status === "uploading"
  const isUploadError = uploadState.status === "error"
  const isSubmitDisabled = isPending || isUploadPending || (!!selectedFile && isUploadError)

  return (
    <form action={handleFormAction} noValidate aria-label="Career application form">
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

        {/* Resume upload */}
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
              (fileError || fieldError("resumePath")) && "border-destructive",
              isUploadPending && "opacity-70 cursor-wait",
            )}
          >
            <Paperclip size={14} className="text-muted-foreground shrink-0" aria-hidden="true" />
            <span className={cn("text-sm truncate", selectedFile ? "text-foreground" : "text-muted-foreground")}>
              {selectedFile ? selectedFile.name : "Choose file…"}
            </span>
            {selectedFile && uploadState.status === "done" && (
              <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
            {isUploadPending && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums shrink-0">
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                {uploadState.status === "uploading" ? `${uploadState.progress}%` : "…"}
              </span>
            )}
            <input
              id="career-resume"
              name="resume"
              type="file"
              accept={ACCEPTED_TYPES}
              aria-required="true"
              aria-invalid={fileError || fieldError("resumePath") ? "true" : undefined}
              aria-describedby={[
                "career-resume-desc",
                fileError || fieldError("resumePath") ? "career-resume-error" : undefined,
              ]
                .filter(Boolean)
                .join(" ")}
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={isUploadPending}
              className="sr-only"
            />
          </label>

          {/* Upload progress bar */}
          {isUploadPending && uploadState.status === "uploading" && (
            <div
              role="progressbar"
              aria-valuenow={uploadState.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Resume upload progress"
              className="h-1 rounded-full bg-border overflow-hidden"
            >
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          )}

          {/* Upload done confirmation */}
          {uploadState.status === "done" && !fileError && (
            <p className="text-xs text-primary flex items-center gap-1">
              <UploadCloud size={12} aria-hidden="true" />
              Uploaded successfully
            </p>
          )}

          {/* File / upload error */}
          {(fileError || fieldError("resumePath") || isUploadError) && (
            <p
              id="career-resume-error"
              role="alert"
              aria-live="polite"
              className="text-xs text-destructive flex items-center gap-1"
            >
              <AlertCircle size={12} aria-hidden="true" />
              {fileError ?? (isUploadError ? uploadState.message : fieldError("resumePath"))}
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

        {/* Bot protection */}
        <Turnstile
          handleRef={turnstileRef}
          onToken={handleTurnstileToken}
          onExpire={handleTurnstileExpire}
          onError={handleTurnstileError}
        />

        {/* General error */}
        {state && !state.ok && !state.fieldErrors && state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          aria-busy={isPending || isUploadPending}
          aria-label={isPending ? "Submitting your application…" : isUploadPending ? "Uploading resume…" : "Submit application"}
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
          {(isPending || isUploadPending) && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {isPending ? "Submitting…" : isUploadPending ? "Uploading…" : "Apply now"}
        </button>
      </div>
    </form>
  )
}
