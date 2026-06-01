import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"

function MerchCardSkeleton() {
  return (
    <div
      className="rounded-xl bg-card border border-border overflow-hidden"
      aria-hidden="true"
    >
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-8 w-full rounded bg-muted animate-pulse mt-1" />
      </div>
    </div>
  )
}

export default function MerchLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <div className="[padding-block:clamp(6rem,12vw,10rem)] bg-background">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-[80rem]">
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="h-3 w-12 rounded bg-muted animate-pulse" />
            <div className="h-[clamp(2.25rem,1.8rem+2.5vw,4rem)] w-28 rounded bg-muted animate-pulse" />
            <div className="h-5 w-80 rounded bg-muted animate-pulse" />
            <div className="h-10 w-40 rounded-lg bg-muted animate-pulse mt-2" />
          </div>
        </div>
      </div>

      {/* Promo card skeleton */}
      <Section padding="sm" className="bg-background">
        <Container>
          <div className="rounded-2xl bg-muted animate-pulse h-40" aria-hidden="true" />
        </Container>
      </Section>

      {/* Product grid skeleton */}
      <Section padding="md" className="bg-background">
        <Container>
          <div className="h-6 w-36 rounded bg-muted animate-pulse mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <MerchCardSkeleton key={i} />
            ))}
          </div>
        </Container>
      </Section>
    </>
  )
}
