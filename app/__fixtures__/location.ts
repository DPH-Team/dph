import type { Location } from "@/lib/fixtures/types"

export const location: Location = {
  name: "District Pour Haus",
  address: "686 Mike McCarthy Way",
  city: "Green Bay",
  state: "WI",
  zip: "54304",
  lat: 44.4952,
  lng: -88.0509,
  phone: "(920) 278-2669",
  email: "hello@districtpourhaus.com",
  parkingNotes: "Free street parking on Main St and Pine Ave. The municipal lot on Walnut St has free evening parking after 5 PM. We're two blocks from the Fox River trail if you're biking.",
  transitNotes: "Green Bay Metro Route 4 stops one block south. Uber and Lyft both service the area well.",
  accessibilityNotes: "Fully accessible entrance on the Pine Ave side. Accessible restrooms. Please call ahead if you need additional accommodations and we'll make it work.",
  isGameDay: false,
  gameDayKickoff: "7:20 PM",
  gameDayOpponent: "Chicago Bears",
}

export async function getLocation(): Promise<Location> {
  return location
}
