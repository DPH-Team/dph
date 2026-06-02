import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"

function EventCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl bg-card border border-border"
      aria-hidden="true"
    >
      <div className="aspect-[16/9] bg-muted animate-pulse" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="flex flex-col gap-1">
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-3 w-20 rounded bg-muted animate-pulse mt-1" />
      </div>
    </div>
  )
}

export default function EventsLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <div className="[padding-block:clamp(6rem,12vw,10rem)] bg-background">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-[80rem]">
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="h-[clamp(2.25rem,1.8rem+2.5vw,4rem)] w-28 rounded bg-muted animate-pulse" />
            <div className="h-5 w-96 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Filters + grid skeleton */}
      <Section padding="sm">
        <Container>
          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="h-9 w-32 rounded-full bg-muted animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 rounded-full bg-muted animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          {/* View toggle */}
          <div className="flex justify-end mb-6">
            <div className="h-9 w-36 rounded-full bg-muted animate-pulse" />
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <div className="h-3 w-40 rounded bg-muted animate-pulse" />
          </div>
        </Container>
      </Section>
    </>
  )
}
