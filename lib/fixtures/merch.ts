import type { MerchProduct } from "./types"

export const PRINTIFY_STORE_URL = "https://districtpourhaus.printify.me"

// Per-product URLs use the confirmed Pop-Up store pattern:
//   <PRINTIFY_STORE_URL>/product/<id>/<handle>
// IDs and handles here are realistic mock values that mirror what the live
// Printify API would return for published products.
export const merchProducts: MerchProduct[] = [
  {
    id: "mp-1",
    title: "Haus Logo Tee — Black",
    priceCents: 3200,
    imageUrl: "/merch/placeholder-tee-black.jpg",
    printifyUrl: `${PRINTIFY_STORE_URL}/product/mp-1/haus-logo-tee-black`,
    tags: ["apparel", "tee", "bestseller"],
    category: "Apparel",
  },
  {
    id: "mp-2",
    title: "Haus Logo Tee — Cream",
    priceCents: 3200,
    imageUrl: "/merch/placeholder-tee-cream.jpg",
    printifyUrl: `${PRINTIFY_STORE_URL}/product/mp-2/haus-logo-tee-cream`,
    tags: ["apparel", "tee"],
    category: "Apparel",
  },
  {
    id: "mp-3",
    title: "District Pour Haus Pint Glass",
    priceCents: 1800,
    imageUrl: "/merch/placeholder-glass.jpg",
    printifyUrl: `${PRINTIFY_STORE_URL}/product/mp-3/district-pour-haus-pint-glass`,
    tags: ["drinkware", "glassware"],
    category: "Drinkware",
  },
  {
    id: "mp-4",
    title: "Self-Pour Club Hoodie",
    priceCents: 5800,
    imageUrl: "/merch/placeholder-hoodie.jpg",
    printifyUrl: `${PRINTIFY_STORE_URL}/product/mp-4/self-pour-club-hoodie`,
    tags: ["apparel", "hoodie"],
    category: "Apparel",
  },
  {
    id: "mp-5",
    title: "Wisconsin Roots Sticker Pack",
    priceCents: 900,
    imageUrl: "/merch/placeholder-stickers.jpg",
    printifyUrl: `${PRINTIFY_STORE_URL}/product/mp-5/wisconsin-roots-sticker-pack`,
    tags: ["accessories", "stickers"],
    category: "Accessories",
  },
  {
    id: "mp-6",
    title: "Game Day Beanie",
    priceCents: 2800,
    imageUrl: "/merch/placeholder-beanie.jpg",
    printifyUrl: `${PRINTIFY_STORE_URL}/product/mp-6/game-day-beanie`,
    tags: ["accessories", "seasonal", "game-day"],
    category: "Accessories",
  },
]

export async function getMerchProducts(): Promise<MerchProduct[]> {
  return merchProducts
}
