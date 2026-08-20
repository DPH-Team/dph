import type { CareersBodyValue } from "@/lib/validators/content-blocks"

export const careersContent: CareersBodyValue = {
  eyebrow: "Hiring",
  headline: "Work With Us",
  lead: "We're hiring people who give a damn. If you care about craft, community, and showing up for your team, this is your place.",
  whyEyebrow: "Why DPH",
  whyHeading: "What we offer",
  whyUs: [
    {
      icon: "dollar-sign",
      title: "Competitive pay",
      description:
        "We pay above market for every role — front of house, kitchen, and operations. We review comp annually and give increases based on performance, not tenure alone.",
    },
    {
      icon: "trending-up",
      title: "Real tips",
      description:
        "Self-pour means higher check averages and happy guests who've chosen exactly what they want. That translates into better tips for the team on the floor.",
    },
    {
      icon: "heart",
      title: "The vibe is the job",
      description:
        "We're a community taproom. Game days, live music, trivia nights — it's a great place to work because it's a great place to be. No drama, no ego, just good beer and good people.",
    },
  ],
}

export async function getCareersContent(): Promise<CareersBodyValue> {
  return careersContent
}
