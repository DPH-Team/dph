import type { MerchProduct } from "./types"

export const PRINTIFY_STORE_URL = "https://districtpourhaus.printify.me"

export const merchProducts: MerchProduct[] = [
  {
    id: "mp-1",
    title: "Haus Logo Tee — Black",
    priceCents: 3200,
    imageUrl: "/merch/placeholder-tee-black.jpg",
    printifyUrl: PRINTIFY_STORE_URL,
    tags: ["apparel", "tee", "bestseller"],
  },
  {
    id: "mp-2",
    title: "Haus Logo Tee — Cream",
    priceCents: 3200,
    imageUrl: "/merch/placeholder-tee-cream.jpg",
    printifyUrl: PRINTIFY_STORE_URL,
    tags: ["apparel", "tee"],
  },
  {
    id: "mp-3",
    title: "District Pour Haus Pint Glass",
    priceCents: 1800,
    imageUrl: "/merch/placeholder-glass.jpg",
    printifyUrl: PRINTIFY_STORE_URL,
    tags: ["drinkware", "glassware"],
  },
  {
    id: "mp-4",
    title: "Self-Pour Club Hoodie",
    priceCents: 5800,
    imageUrl: "/merch/placeholder-hoodie.jpg",
    printifyUrl: PRINTIFY_STORE_URL,
    tags: ["apparel", "hoodie"],
  },
  {
    id: "mp-5",
    title: "Wisconsin Roots Sticker Pack",
    priceCents: 900,
    imageUrl: "/merch/placeholder-stickers.jpg",
    printifyUrl: PRINTIFY_STORE_URL,
    tags: ["accessories", "stickers"],
  },
  {
    id: "mp-6",
    title: "Game Day Beanie",
    priceCents: 2800,
    imageUrl: "/merch/placeholder-beanie.jpg",
    printifyUrl: PRINTIFY_STORE_URL,
    tags: ["accessories", "seasonal", "game-day"],
  },
]

export async function getMerchProducts(): Promise<MerchProduct[]> {
  return merchProducts
}
