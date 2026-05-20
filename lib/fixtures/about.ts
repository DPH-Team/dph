import type { AboutContent } from "./types"

export const aboutContent: AboutContent = {
  headline: "Our Haus is Your Haus",
  lead: "We built District Pour Haus because we wanted a place where the beer was great, the food was honest, and the Wi-Fi password was somewhere on the wall. A place that felt like yours the minute you walked in.",
  paragraphs: [
    "It started with a craving — not for a specific beer, but for a specific feeling. That rare thing where you walk into a bar and immediately relax, where the person next to you is already talking about the game, and where nobody's rushing you out.",
    "District Pour Haus opened in Green Bay because this city deserved a taproom that matched its energy: big, bold, and genuinely proud of where it's from. We're a self-pour taproom, which means you're in charge. RFID card, 32 taps, pour as much or as little as you want. Try the imperial stout. Try the farmhouse ale. Try three things on the same Saturday afternoon — that's the whole point.",
    "The kitchen came next. Because you can't drink on an empty stomach, and because Wisconsin has good food if you know where to look. We smoke our own brisket, batter our curds in pale ale, and bake a kringle that rotates with the seasons. Everything pairs with something on the wall.",
  ],
  rfidSteps: [
    {
      icon: "credit-card",
      label: "Get an RFID Card",
      description: "Tap your card at the kiosk or get one from the bar. Load it with credit and you're set.",
    },
    {
      icon: "beer",
      label: "Tap and Pour",
      description: "Hold your card to any tap. Pour what you want, as much as you want. The display tracks it live.",
    },
    {
      icon: "receipt",
      label: "Settle Up",
      description: "When you're done, return your card at the bar. We charge only what you poured.",
    },
  ],
  values: [
    {
      title: "Wisconsin First",
      description: "Our tap list prioritizes Wisconsin breweries. Our menu uses Wisconsin ingredients wherever we can source them.",
    },
    {
      title: "Craft Always",
      description: "We don't cut corners on ingredients, process, or people. If it's worth doing, it's worth doing right.",
    },
    {
      title: "Community Is the Product",
      description: "The beer is great. But the reason you'll come back is the people. We hire for warmth as much as skill.",
    },
    {
      title: "Game Day Is Sacred",
      description: "We bleed green and gold. Every Packers game is an event. The whole Haus shows up for it.",
      isGameDay: true,
    },
  ],
}

export async function getAboutContent(): Promise<AboutContent> {
  return aboutContent
}
