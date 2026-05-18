import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/35 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* primary fill: copper bg, base text (AA 5.7:1 per spec) */
        default:
          "bg-primary text-primary-foreground hover:bg-[oklch(0.610_0.128_46)] active:bg-[oklch(0.572_0.124_45)]",
        secondary:
          "bg-secondary text-secondary-foreground border-border hover:bg-[oklch(0.235_0.004_286)] active:bg-[oklch(0.310_0.005_286)]",
        outline:
          "border-border bg-transparent text-foreground hover:bg-[oklch(0.198_0.003_286)] active:bg-[oklch(0.235_0.004_286)]",
        ghost:
          "bg-transparent text-foreground hover:bg-[oklch(0.198_0.003_286)] active:bg-[oklch(0.235_0.004_286)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[oklch(0.520_0.146_32)] active:bg-[oklch(0.490_0.143_32)] focus-visible:ring-destructive/50",
        link: "text-primary underline-offset-4 decoration-primary/40 hover:decoration-primary active:text-[oklch(0.572_0.124_45)] underline",
      },
      size: {
        default: "h-10 gap-1.5 px-4 [&_svg:not([class*='size-'])]:size-[18px]",
        sm:      "h-8 gap-1 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg:      "h-12 gap-2 px-6 text-base [&_svg:not([class*='size-'])]:size-5",
        icon:    "size-10 [&_svg:not([class*='size-'])]:size-5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
