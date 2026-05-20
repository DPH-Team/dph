import type { HomeCallouts } from "./types"

export const homeCallouts: HomeCallouts = [
  {
    eyebrow: "Self-Pour",
    title: "32 Taps, Your Rules",
    body: "Load an RFID card and pour exactly what you want — a taste, a half-pint, or a full pour. No waiting, no waste.",
    href: "/taps",
    cta: "See What's Pouring",
  },
  {
    eyebrow: "Scratch Kitchen",
    title: "Food Worth Staying For",
    body: "Smoked brisket, pale ale cheese curds, and a rotating kringle. Everything on the menu pairs with something on the wall.",
    href: "/menu",
    cta: "Browse the Menu",
  },
  {
    eyebrow: "Events",
    title: "Game Day Is Sacred",
    body: "Every Packers game is an event at District Pour Haus. We open early, we get loud, and we stay until the final whistle.",
    href: "/events",
    cta: "Upcoming Events",
  },
]

export async function getHomeCallouts(): Promise<HomeCallouts> {
  return homeCallouts
}
