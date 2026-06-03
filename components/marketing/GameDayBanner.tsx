import { cn } from "@/lib/utils"

export type GameDayBannerProps = {
  kickoff: string
  opponent: string
  className?: string
}

export function GameDayBanner({ kickoff, opponent, className }: GameDayBannerProps) {
  return (
    <div
      className={cn(
        "w-full bg-packers-green py-4",
        className
      )}
      aria-label="Game day promotion"
    >
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
        <p
          className="text-xs font-semibold tracking-widest uppercase text-packers-gold"
          aria-label="Game day"
        >
          Packers Tonight
        </p>
        <span className="hidden sm:block text-cream/40 text-sm" aria-hidden="true">·</span>
        <p className="text-sm font-medium text-cream">
          vs. {opponent}
          <span className="ml-2 text-cream/70">Kickoff {kickoff}</span>
        </p>
        <span className="hidden sm:block text-cream/40 text-sm" aria-hidden="true">·</span>
        <p className="text-xs text-cream/70">
          $5 pours all game · every screen live
        </p>
      </div>
    </div>
  )
}
