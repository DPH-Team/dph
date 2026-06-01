import type { FaqEntry } from "@/lib/fixtures/types"

export const faqEntries: FaqEntry[] = [
  {
    id: "faq-1",
    question: "How does the self-pour system work?",
    answer: "You get an RFID card at the bar, load it with a credit balance, then hold it to any tap to pour. The screen shows you the pour amount and cost in real time. When you're done, return the card and we settle the balance — you only pay for what you poured.",
    category: "self-pour",
  },
  {
    id: "faq-2",
    question: "Is there a minimum purchase to use a card?",
    answer: "No minimum. The card is free to get. We put a small pre-auth hold on a payment method to start, and you only get charged for actual pours at the end.",
    category: "self-pour",
  },
  {
    id: "faq-3",
    question: "Can I make a reservation?",
    answer: "Yes — use the form on this page or call us directly. We hold tables for parties of 6 or more. Smaller groups are welcome to walk in; we almost always have seats, though game-day Sundays fill up fast.",
    category: "reservations",
  },
  {
    id: "faq-4",
    question: "Do you host private events?",
    answer: "Absolutely. We have a semi-private section that can accommodate up to 40 guests for buyout-style events, or we can close the full Haus for larger parties. Use the reservation form and select 'Private Event' to get the conversation started.",
    category: "reservations",
  },
  {
    id: "faq-5",
    question: "Is the tap list updated in real time?",
    answer: "Yes — our taps page pulls live from Untappd. It typically refreshes every 5 minutes. If a keg kicks, it comes off the list. If we put something new on, it shows up quickly.",
    category: "taps",
  },
  {
    id: "faq-6",
    question: "Are you dog-friendly?",
    answer: "Dogs are welcome on the outdoor patio when weather allows. No dogs inside, per health code. Well-behaved dogs only — they still have to follow the rules.",
    category: "venue",
  },
  {
    id: "faq-7",
    question: "Do you have dietary accommodations?",
    answer: "We take allergies seriously. Every dish can be modified, and our kitchen is careful about cross-contamination. Check the menu's allergen legend or ask your server — we want you to enjoy your meal safely.",
    category: "dietary",
  },
  {
    id: "faq-8",
    question: "Can kids come in?",
    answer: "Yes, kids are welcome until 9 PM. They can enjoy food and non-alcoholic drinks. After 9 PM, it's 21+ only. No exceptions on ID — we check everyone.",
    category: "venue",
  },
]

export async function getFaqEntries(): Promise<FaqEntry[]> {
  return faqEntries
}
