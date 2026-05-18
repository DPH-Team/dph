import type { Posting } from "./types"

export const postings: Posting[] = [
  {
    id: "post-1",
    title: "Taproom Host",
    type: "part-time",
    department: "Front of House",
    description: "Help guests navigate the self-pour system, keep the floor friendly and clean, and make sure everyone leaves with their new favorite beer.",
    responsibilities: [
      "Welcome and orient guests to the self-pour system",
      "Monitor tap activity and assist with pour questions",
      "Maintain floor cleanliness and glass rotation",
      "Card guests and enforce responsible consumption policies",
    ],
    requirements: [
      "Must be 21+",
      "ServSafe or TIPS certification preferred (we'll train)",
      "Weekend availability required",
      "Warm, approachable demeanor",
    ],
    isOpen: true,
  },
  {
    id: "post-2",
    title: "Line Cook",
    type: "full-time",
    department: "Kitchen",
    description: "Cook real food with real ingredients. The kitchen at DPH is small but the menu is tight — you'll own your station and contribute ideas as we evolve.",
    responsibilities: [
      "Prep and execute kitchen menu to spec",
      "Maintain food safety and cleanliness standards",
      "Contribute to seasonal menu development",
      "Cross-train on all stations as needed",
    ],
    requirements: [
      "2+ years line cook experience",
      "Food Handler's Certification required",
      "Ability to work weekends and some evenings",
      "Passion for local and seasonal ingredients",
    ],
    isOpen: true,
  },
  {
    id: "post-3",
    title: "Events & Marketing Coordinator",
    type: "part-time",
    department: "Operations",
    description: "Plan and execute the events calendar — live music, trivia nights, tap takeovers, watch parties. Also own our social media presence and email newsletter.",
    responsibilities: [
      "Book and coordinate live music and weekly events",
      "Manage social media accounts (IG, Facebook)",
      "Write and send monthly newsletter",
      "Coordinate with brewery reps for tap takeovers",
    ],
    requirements: [
      "Strong written communication skills",
      "Experience with social media content creation",
      "Event coordination experience a plus",
      "Love of craft beer and live music helps a lot",
    ],
    isOpen: true,
  },
]

export async function getPostings(): Promise<Posting[]> {
  return postings
}

export async function getOpenPostings(): Promise<Posting[]> {
  return postings.filter((p) => p.isOpen)
}

export function getPostingById(id: string): Posting | undefined {
  return postings.find((p) => p.id === id)
}
