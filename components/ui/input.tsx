import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[var(--radius-md)] border border-border bg-input px-3 py-1 text-sm text-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-[oklch(0.400_0.006_80)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[oklch(0.198_0.003_286)] disabled:opacity-50 read-only:bg-[oklch(0.140_0.002_286)] read-only:text-muted-foreground aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/35",
        className
      )}
      {...props}
    />
  )
}

export { Input }
