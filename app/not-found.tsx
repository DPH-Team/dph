import Link from "next/link"
import { Wordmark } from "@/components/marketing/Wordmark"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="min-h-svh flex flex-col">
      {/* Packers-green illustration ground */}
      <section
        className="flex-1 bg-[--color-packers-green] flex flex-col items-center justify-center text-center px-4 py-24"
        aria-labelledby="not-found-title"
      >
        <div className="flex flex-col items-center gap-8 max-w-md">
          {/* Gold wordmark */}
          <Wordmark size="lg" tone="gold" asLink={false} />

          {/* 404 numeral */}
          <p
            className="font-display font-medium text-[clamp(6rem,15vw,12rem)] leading-none text-[--color-packers-gold] opacity-20 tabular-nums select-none"
            aria-hidden="true"
          >
            404
          </p>

          <div className="flex flex-col gap-3 -mt-6">
            <h1
              id="not-found-title"
              className="font-display font-medium text-[clamp(1.5rem,1.2rem+2vw,2.5rem)] leading-[1.2] text-[--color-cream]"
            >
              Couldn&apos;t find that page
            </h1>
            <p className="text-[--color-cream]/70 text-base leading-relaxed">
              Looks like this one went dry. Head back to the Haus and find what you&apos;re looking for.
            </p>
          </div>

          <Button size="lg" nativeButton={false} render={<Link href="/" />}>
            Back to Home
          </Button>
        </div>
      </section>
    </main>
  )
}
