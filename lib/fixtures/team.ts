import type { TeamMember } from "./types"

export const team: TeamMember[] = [
  {
    id: "tm-1",
    name: "Marcus Webb",
    role: "Owner & Head of Vibes",
    bio: "Marcus has been homebrewing since college and haunting taprooms since before taprooms were a thing. He opened District Pour Haus to create the bar he'd always wanted — one where the staff knows your name and the beer list changes faster than your mind.",
    imageUrl: "/team/placeholder-1.jpg",
  },
  {
    id: "tm-2",
    name: "Dani Okafor",
    role: "Kitchen Director",
    bio: "Dani grew up in a family that treated cooking as a love language. After years in fine dining, she came to DPH to cook food that actually makes people happy. The spent grain pretzel is entirely her fault.",
    imageUrl: "/team/placeholder-2.jpg",
  },
  {
    id: "tm-3",
    name: "Theo Marchetti",
    role: "Front of House Lead",
    bio: "Theo has been in hospitality for 12 years and still gets a kick out of watching someone find their new favorite beer. He oversees the floor, trains the staff, and holds the record for fastest RFID card activation.",
    imageUrl: "/team/placeholder-3.jpg",
  },
  {
    id: "tm-4",
    name: "Keiko Flores",
    role: "Events Coordinator",
    bio: "Keiko programs everything from trivia nights to tap takeovers. She's the reason your favorite band played here and the reason game-day specials run like clockwork.",
    imageUrl: "/team/placeholder-4.jpg",
  },
]

export async function getTeam(): Promise<TeamMember[]> {
  return team
}
