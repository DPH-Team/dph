import type { HomeHero } from "./types"

export const hero: HomeHero = {
  eyebrow: "Wisconsin Self-Pour Taproom",
  headline: "Our Haus is Your Haus",
  lead: "32 craft taps, a scratch kitchen, and a front-row seat to the game. Pour your own adventure — you set the pace.",
  primaryCta: { label: "See What's Pouring", href: "/taps" },
  secondaryCta: { label: "Reserve a Table", href: "/reservations" },
  imageUrl: null,
}

export async function getHero(): Promise<HomeHero> {
  return hero
}
