import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:bg-[oklch(0.198_0.003_286)] disabled:opacity-50 read-only:bg-[oklch(0.140_0.002_286)] read-only:text-muted-foreground aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/35",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
