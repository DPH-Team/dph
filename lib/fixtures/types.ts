export type Event = {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt: string | null
  description: string
  imageUrl: string
  ticketUrl: string | null
  featured: boolean
  tags: string[]
}

export type Tap = {
  id: string
  name: string
  brewery: string
  style: string
  abv: number
  ibu: number | null
  description: string
  imageUrl: string | null
  tapNumber: number
  isFeatured: boolean
}

export type MenuSection = {
  id: string
  name: string
  description: string | null
  sortOrder: number
  items: MenuItem[]
}

export type MenuItem = {
  id: string
  sectionId: string
  name: string
  description: string
  priceCents: number
  allergens: ("gluten" | "dairy" | "nuts" | "shellfish" | "egg" | "soy")[]
  imageUrl: string | null
  available: boolean
  sortOrder: number
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export type DayHours = {
  open: string
  close: string
  closed: boolean
}

export type WeeklyHours = {
  [K in DayOfWeek]: DayHours
}

export type HoursOverride = {
  date: string
  open: string | null
  close: string | null
  closed: boolean
  note: string | null
}

export type AboutContent = {
  headline: string
  lead: string
  paragraphs: string[]
  rfidSteps: { icon: string; label: string; description: string }[]
  values: { title: string; description: string; isGameDay?: boolean }[]
}

export type HomeCallout = {
  eyebrow?: string
  title: string
  body: string
  href?: string
  cta?: string
}

export type HomeCallouts = HomeCallout[]

export type TeamMember = {
  id: string
  name: string
  role: string
  bio: string
  imageUrl: string | null
}

export type GalleryImage = {
  id: string
  src: string
  alt: string
  width: number
  height: number
  caption: string | null
  tags: string[]
}

export type MerchProduct = {
  id: string
  title: string
  priceCents: number
  imageUrl: string
  printifyUrl: string
  tags: string[]
  /** Human-readable category label derived from Printify tags/product type. Defaults to "Other". */
  category: string
}

export type Posting = {
  id: string
  title: string
  type: "full-time" | "part-time"
  department: string
  description: string
  responsibilities: string[]
  requirements: string[]
  isOpen: boolean
}

export type FaqEntry = {
  id: string
  question: string
  answer: string
  category: string | null
}

export type IgPost = {
  id: string
  imageUrl: string
  alt: string
  profileUrl: string
  permalink: string
  caption: string | null
}

export type Location = {
  name: string
  address: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
  phone: string
  email: string
  parkingNotes: string
  transitNotes: string
  accessibilityNotes: string
  isGameDay: boolean
  gameDayKickoff?: string
  gameDayOpponent?: string
}

export type LegalDoc = {
  slug: "privacy" | "terms"
  title: string
  updatedAt: string
  paragraphs: string[]
}

export type HomeHero = {
  eyebrow: string
  headline: string
  lead: string
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
  imageUrl: string | null
  /** "image" or "video" when a specific media type is selected; null when unset. */
  mediaType: "image" | "video" | null
  /**
   * Supabase 'media' bucket storage-relative path (e.g. "hero/uuid.mp4")
   * OR a full https URL. null when no media is uploaded.
   */
  mediaUrl: string | null
}

export type Checkin = {
  id: string
  userFirstName: string
  userAvatarUrl: string | null
  beerName: string
  brewery: string
  beerLabelUrl: string | null
  /** 0..5, null when unrated */
  rating: number | null
  /** ISO-8601 timestamp */
  createdAt: string
}
