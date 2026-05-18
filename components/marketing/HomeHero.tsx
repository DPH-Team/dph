"use client"

import Link from "next/link"
import { useReducedMotion, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/marketing/layout/Container"
import type { HomeHero as HomeHeroType } from "@/lib/fixtures/types"

export type HomeHeroProps = {
  hero: HomeHeroType
}

export function HomeHero({ hero }: HomeHeroProps) {
  const reduced = useReducedMotion()

  return (
    <section
      className="relative min-h-[90svh] flex items-center bg-background overflow-hidden"
      aria-label="Welcome to District Pour Haus"
    >
      {/* Background parallax layer */}
      {!reduced ? (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-background via-background to-neutral-900"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-background via-background to-neutral-900"
          aria-hidden="true"
        />
      )}

      {/* Subtle grain-like radial accent */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.648_0.130_47_/_0.06),transparent)]"
        aria-hidden="true"
      />

      <Container className="relative z-10 py-24 sm:py-32">
        <div className="flex flex-col gap-6 max-w-3xl">
          {/* Eyebrow */}
          {!reduced ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <p className="text-sm font-medium tracking-widest uppercase text-[--color-packers-gold]">
                {hero.eyebrow}
              </p>
              <div
                className="h-px w-16 bg-[--color-packers-gold] opacity-50"
                aria-hidden="true"
              />
            </motion.div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium tracking-widest uppercase text-[--color-packers-gold]">
                {hero.eyebrow}
              </p>
              <div className="h-px w-16 bg-[--color-packers-gold] opacity-50" aria-hidden="true" />
            </div>
          )}

          {/* Headline */}
          {!reduced ? (
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="font-display font-medium text-[clamp(2.75rem,2rem+4vw,6rem)] leading-[1.05] tracking-[-0.03em] text-foreground"
            >
              {hero.headline}
            </motion.h1>
          ) : (
            <h1 className="font-display font-medium text-[clamp(2.75rem,2rem+4vw,6rem)] leading-[1.05] tracking-[-0.03em] text-foreground">
              {hero.headline}
            </h1>
          )}

          {/* Lead */}
          {!reduced ? (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl"
            >
              {hero.lead}
            </motion.p>
          ) : (
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              {hero.lead}
            </p>
          )}

          {/* CTAs */}
          {!reduced ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1], delay: 0.44 }}
              className="flex flex-wrap gap-3 pt-2"
            >
              <Button size="lg" render={<Link href={hero.primaryCta.href} />}>
                {hero.primaryCta.label}
              </Button>
              <Button variant="outline" size="lg" render={<Link href={hero.secondaryCta.href} />}>
                {hero.secondaryCta.label}
              </Button>
            </motion.div>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" render={<Link href={hero.primaryCta.href} />}>
                {hero.primaryCta.label}
              </Button>
              <Button variant="outline" size="lg" render={<Link href={hero.secondaryCta.href} />}>
                {hero.secondaryCta.label}
              </Button>
            </div>
          )}
        </div>
      </Container>

      {/* Bottom fade into next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />
    </section>
  )
}
