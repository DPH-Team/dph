/**
 * lib/content-icons.ts — Curated, client-safe registry of icons available to
 * content blocks.
 *
 * Content blocks (e.g. `careers_body.whyUs[].icon`, `about_body.rfidSteps[].icon`)
 * store icons as kebab-case string keys rather than component references. This
 * file is intentionally lightweight (a handful of named lucide-react imports,
 * no namespace import) so it's safe to import from client components — it
 * backs the admin icon-picker's quick-access grid.
 *
 * Public pages resolve the full range of stored icon keys (not just this
 * curated subset) via `resolveContentIcon` in `./content-icons-resolve`,
 * a server-only module that falls back to this registry.
 */
import {
  DollarSign,
  TrendingUp,
  Heart,
  CreditCard,
  Beer,
  Receipt,
  Users,
  Star,
  Clock,
  CalendarDays,
  Music,
  UtensilsCrossed,
  Sparkles,
  Trophy,
  Coffee,
  MapPin,
  type LucideIcon,
} from "lucide-react"

export const CONTENT_ICONS = {
  "dollar-sign": DollarSign,
  "trending-up": TrendingUp,
  heart: Heart,
  "credit-card": CreditCard,
  beer: Beer,
  receipt: Receipt,
  users: Users,
  star: Star,
  clock: Clock,
  calendar: CalendarDays,
  music: Music,
  utensils: UtensilsCrossed,
  sparkles: Sparkles,
  trophy: Trophy,
  coffee: Coffee,
  "map-pin": MapPin,
} as const satisfies Record<string, LucideIcon>

export type ContentIconKey = keyof typeof CONTENT_ICONS

export const CONTENT_ICON_OPTIONS: { value: ContentIconKey; label: string }[] = [
  { value: "dollar-sign", label: "Dollar sign" },
  { value: "trending-up", label: "Trending up" },
  { value: "heart", label: "Heart" },
  { value: "credit-card", label: "Credit card" },
  { value: "beer", label: "Beer" },
  { value: "receipt", label: "Receipt" },
  { value: "users", label: "Users" },
  { value: "star", label: "Star" },
  { value: "clock", label: "Clock" },
  { value: "calendar", label: "Calendar" },
  { value: "music", label: "Music" },
  { value: "utensils", label: "Utensils" },
  { value: "sparkles", label: "Sparkles" },
  { value: "trophy", label: "Trophy" },
  { value: "coffee", label: "Coffee" },
  { value: "map-pin", label: "Map pin" },
]
