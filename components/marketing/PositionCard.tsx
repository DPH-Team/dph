import { cn } from "@/lib/utils"
import type { Posting } from "@/lib/fixtures/types"

export type PositionCardProps = {
  posting: Posting
  onApply: (id: string) => void
  className?: string
}

export function PositionCard({ posting, onApply, className }: PositionCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-4 p-5 rounded-xl bg-card border border-border",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h3 className="font-display font-medium text-lg text-foreground">
            {posting.title}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{posting.department}</span>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            <span className="text-sm text-muted-foreground capitalize">
              {posting.type.replace("-", " ")}
            </span>
          </div>
        </div>
        {posting.isOpen && (
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-packers-green/20 text-cream border border-packers-green/30">
            Hiring
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{posting.description}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {posting.responsibilities.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
              Responsibilities
            </h4>
            <ul className="flex flex-col gap-1" role="list">
              {posting.responsibilities.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1 shrink-0" aria-hidden="true">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {posting.requirements.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
              Requirements
            </h4>
            <ul className="flex flex-col gap-1" role="list">
              {posting.requirements.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1 shrink-0" aria-hidden="true">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {posting.isOpen && (
        <div className="pt-1">
          <button
            onClick={() => onApply(posting.id)}
            className="text-sm font-medium text-primary hover:text-copper-hover transition-colors underline underline-offset-4"
          >
            Apply for this role →
          </button>
        </div>
      )}
    </article>
  )
}
