import type { IgPost } from "@/lib/fixtures/types"

export const INSTAGRAM_PROFILE_URL = "https://instagram.com/districtpourhaus"

export const igPosts: IgPost[] = [
  {
    id: "ig-1",
    imageUrl: "/instagram/placeholder-1.jpg",
    alt: "Friday night taproom crowd around the self-pour wall",
    profileUrl: INSTAGRAM_PROFILE_URL,
    permalink: INSTAGRAM_PROFILE_URL,
    caption: null,
  },
  {
    id: "ig-2",
    imageUrl: "/instagram/placeholder-2.jpg",
    alt: "Cheese curd basket, golden and fresh from the fryer",
    profileUrl: INSTAGRAM_PROFILE_URL,
    permalink: INSTAGRAM_PROFILE_URL,
    caption: null,
  },
  {
    id: "ig-3",
    imageUrl: "/instagram/placeholder-3.jpg",
    alt: "Live music at District Pour Haus — packed house",
    profileUrl: INSTAGRAM_PROFILE_URL,
    permalink: INSTAGRAM_PROFILE_URL,
    caption: null,
  },
  {
    id: "ig-4",
    imageUrl: "/instagram/placeholder-4.jpg",
    alt: "Game day — every screen showing the Packers",
    profileUrl: INSTAGRAM_PROFILE_URL,
    permalink: INSTAGRAM_PROFILE_URL,
    caption: null,
  },
  {
    id: "ig-5",
    imageUrl: "/instagram/placeholder-5.jpg",
    alt: "Haus Smash Burger with fries and coleslaw on a wooden board",
    profileUrl: INSTAGRAM_PROFILE_URL,
    permalink: INSTAGRAM_PROFILE_URL,
    caption: null,
  },
  {
    id: "ig-6",
    imageUrl: "/instagram/placeholder-6.jpg",
    alt: "Golden hour in the taproom with warm copper lighting",
    profileUrl: INSTAGRAM_PROFILE_URL,
    permalink: INSTAGRAM_PROFILE_URL,
    caption: null,
  },
]

export async function getIgPosts(): Promise<IgPost[]> {
  return igPosts
}
