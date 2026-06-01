import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"

function TapCardSkeleton() {
  return (
    <div
      className="rounded-xl bg-card border border-border overflow-hidden"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="w-7 h-6 rounded bg-muted animate-pulse shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function TapsLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <div className="[padding-block:clamp(6rem,12vw,10rem)] bg-background">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-[80rem]">
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="h-[clamp(2.25rem,1.8rem+2.5vw,4rem)] w-24 rounded bg-muted animate-pulse" />
            <div className="h-5 w-80 rounded bg-muted animate-pulse" />
            <div className="flex items-center gap-3 mt-1">
              <div className="size-2.5 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter + grid skeleton */}
      <Section padding="sm">
        <Container>
          {/* Filter bar */}
          <div className="py-3 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-24 rounded-full bg-muted animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <TapCardSkeleton key={i} />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="h-3 w-48 rounded bg-muted animate-pulse" />
          </div>
        </Container>
      </Section>
    </>
  )
}
