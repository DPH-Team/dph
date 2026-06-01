import type { Event } from "./types"

export const events: Event[] = [
  {
    id: "evt-1",
    slug: "trivia-night-jun-18",
    title: "Trivia Night — June 18",
    startsAt: "2026-06-18T19:00:00",
    endsAt: "2026-06-18T21:30:00",
    description: "Dust off your brain cells. Six rounds of general knowledge trivia hosted by the one and only Scratch McGee. Teams of 1–6. No signup needed — just show up, grab a pour, and compete.",
    imageUrl: "/events/placeholder-trivia.jpg",
    ticketUrl: null,
    featured: false,
    tags: ["trivia", "weekly"],
  },
  {
    id: "evt-2",
    slug: "live-music-the-howlers-jul-11",
    title: "Live Music: The Howlers — July 11",
    startsAt: "2026-07-11T20:00:00",
    endsAt: "2026-07-11T23:00:00",
    description: "Green Bay's own rock and roots band The Howlers bring the house down. Tight grooves, big sound, great beer. This one fills up fast — doors open at 7.",
    imageUrl: "/events/placeholder-music.jpg",
    ticketUrl: "https://districtpourhaus.com/tickets/howlers",
    featured: true,
    tags: ["live-music", "featured"],
  },
  {
    id: "evt-3",
    slug: "packers-watch-party-preseason-aug-2",
    title: "Packers Watch Party — Preseason Opener",
    startsAt: "2026-08-02T19:00:00",
    endsAt: "2026-08-02T23:59:00",
    description: "Kickoff at 7:20. Every screen in the Haus goes green and gold. $5 pours all game, free brat bar at the half. Come early for good seats.",
    imageUrl: "/events/placeholder-gameday.jpg",
    ticketUrl: null,
    featured: false,
    tags: ["game-day", "packers"],
  },
  {
    id: "evt-4",
    slug: "tap-takeover-central-waters-may-12",
    title: "Tap Takeover: Central Waters Brewing",
    startsAt: "2026-05-12T17:00:00",
    endsAt: "2026-05-12T22:00:00",
    description: "The brewers from Central Waters came down to pour their full lineup. Barrel-aged stouts and sours made it a memorable night.",
    imageUrl: "/events/placeholder-takeover.jpg",
    ticketUrl: null,
    featured: false,
    tags: ["tap-takeover", "brewery"],
  },
  {
    id: "evt-5",
    slug: "trivia-night-jul-16",
    title: "Trivia Night — July 16",
    startsAt: "2026-07-16T19:00:00",
    endsAt: "2026-07-16T21:30:00",
    description: "Another great night of trivia. Come test your wits with fellow trivia lovers and taproom regulars. Teams of 1–6, hosted by Scratch McGee.",
    imageUrl: "/events/placeholder-trivia.jpg",
    ticketUrl: null,
    featured: false,
    tags: ["trivia", "weekly"],
  },
  {
    id: "evt-6",
    slug: "live-music-rye-and-the-remedy-apr-26",
    title: "Live Music: Rye & the Remedy",
    startsAt: "2026-04-26T20:00:00",
    endsAt: "2026-04-26T23:00:00",
    description: "Americana, country-blues, and originals from this Madison-based quartet. Great vibes, packed house.",
    imageUrl: "/events/placeholder-music.jpg",
    ticketUrl: null,
    featured: false,
    tags: ["live-music"],
  },
]

export async function getEvents(): Promise<Event[]> {
  return events
}

export async function getUpcomingEvents(): Promise<Event[]> {
  const now = new Date().toISOString()
  return events.filter((e) => e.startsAt > now)
}

export async function getPastEvents(): Promise<Event[]> {
  const now = new Date().toISOString()
  return events.filter((e) => e.startsAt <= now)
}

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug)
}

export async function getEventBySlugAsync(slug: string): Promise<Event | undefined> {
  return getEventBySlug(slug)
}
