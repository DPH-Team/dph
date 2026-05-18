import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type FormFieldProps = {
  label: string
  htmlFor: string
  error?: string | string[]
  description?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  const errorText = Array.isArray(error) ? error[0] : error
  const descId = description ? `${htmlFor}-desc` : undefined
  const errId = errorText ? `${htmlFor}-error` : undefined

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground flex items-center gap-1"
      >
        {label}
        {required && (
          <span className="text-primary" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {description && (
        <p id={descId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {/* Clone children with aria-describedby and aria-required injected */}
      <div
        data-field-control=""
        data-error={errorText ? "true" : undefined}
      >
        {children}
      </div>
      {errorText && (
        <p
          id={errId}
          role="alert"
          className="text-xs text-destructive flex items-start gap-1"
          aria-live="polite"
        >
          {errorText}
        </p>
      )}
    </div>
  )
}
