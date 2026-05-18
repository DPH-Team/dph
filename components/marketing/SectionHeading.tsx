import { cn } from "@/lib/utils"

export type SectionHeadingProps = {
  eyebrow?: string
  children: React.ReactNode
  align?: "left" | "center"
  className?: string
}

export function SectionHeading({
  eyebrow,
  children,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {eyebrow && (
        <p className="text-sm font-medium tracking-widest uppercase text-[--color-packers-gold]">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display font-medium text-[clamp(1.75rem,1.5rem+1.2vw,2.5rem)] leading-[1.15] tracking-[-0.015em] text-foreground">
        {children}
      </h2>
    </div>
  )
}
