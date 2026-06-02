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
  parkingNotes: "Plenty of free surface parking around the Titletown District and Mike McCarthy Way. We're steps from Lombardi Ave. On Packers game days and during big events, lots fill up fast—plan ahead, arrive early, or grab a rideshare. Biking is solid too if the weather's with you.",
  transitNotes: "Green Bay Metro buses serve the west side, and rideshare drop-off is super convenient right here in the Titletown District. Easy parking or easy pickup—your call.",
  accessibilityNotes: "Accessible entrance and restrooms. Questions about parking, entry, or getting set up with our RFID cards? Give us a call at (920) 278-2669 and we'll make sure you're taken care of.",
  isGameDay: false,
  gameDayKickoff: "7:20 PM",
  gameDayOpponent: "Chicago Bears",
}

export async function getLocation(): Promise<Location> {
  return location
}
