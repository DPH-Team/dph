import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo"
import { fetchTaps } from "@/lib/untappd"
import { Section } from "@/components/marketing/layout/Section"
import { Container } from "@/components/marketing/layout/Container"
import { PageHero } from "@/components/marketing/PageHero"
import { TapsClient } from "./TapsClient"
import { AlertTriangle } from "lucide-react"

export const metadata: Metadata = pageMetadata({
  title: "Taps — District Pour Haus",
  description: "Live tap list from our 32-tap wall. Filter by style or ABV — updated every five minutes.",
  path: "/taps",
})

export default async function TapsPage() {
  const { data: taps, stale } = await fetchTaps()

  return (
    <>
      <PageHero
        title="On Tap"
        lead="Pour your own at our self-pour wall. Updated live from Untappd every ~5 minutes."
      />

      {stale && (
        <div
          role="alert"
          className="border-b border-[--color-packers-gold]/30 bg-[--color-packers-gold]/10"
        >
          <div className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8 py-3 flex items-start gap-3">
            <AlertTriangle
              size={16}
              className="shrink-0 mt-0.5 text-[--color-packers-gold]"
              aria-hidden="true"
            />
            <p className="text-sm text-foreground/80">
              <span className="font-medium text-foreground">
                Live menu temporarily unavailable.
              </span>{" "}
              Taps shown are the last-known list; we&apos;ll refresh automatically.
            </p>
          </div>
        </div>
      )}

      <Section padding="sm">
        <Container>
          <TapsClient taps={taps} />

          <p className="mt-8 text-xs text-muted-foreground text-center">
            Live data from Untappd · refreshes every ~5 minutes
          </p>
        </Container>
      </Section>
    </>
  )
}
