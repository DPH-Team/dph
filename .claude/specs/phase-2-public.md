# Phase 2 — Public Marketing Site (Spec)

Status: ready for `dph-frontend` / `dph-design` / `dph-content` execution.
Scope: every public route, content-complete with placeholders. No DB, no Untappd, no Printify, no Resend wiring. Wiring is Phase 5+.

Reference docs (read before coding): `PHASES.md` §Phase 2, `AGENTS.md` (brand palette), `.claude/specs/phase-1-design.md`, `app/(dev)/styleguide/page.tsx`.

---

## 1. Route Map

All public routes live under a single route group: **`app/(public)/`**. The group exists so the public site can share one layout (header + footer + grain overlay context) without putting `(public)` in URLs, and so the `(admin)` group added in Phase 3 can have a completely independent layout. The current placeholder `app/page.tsx` is **deleted** in Phase 2; Home moves into `(public)`.

| URL | File | Primary sections | Mock-data source |
|---|---|---|---|
| `/` | `app/(public)/page.tsx` | Hero, tap-counter strip, upcoming events, featured menu, hours/location card, IG slot, newsletter CTA | `lib/fixtures/hero.ts`, `taps.ts`, `events.ts`, `menu.ts`, `hours.ts`, `instagram.ts` |
| `/about` | `app/(public)/about/page.tsx` | Story, "Our Haus is Your Haus" plate, self-pour + RFID explainer, team grid, values | `lib/fixtures/about.ts`, `team.ts` |
| `/menu` | `app/(public)/menu/page.tsx` | Section tabs (Shareables / Mains / Sides / Desserts), menu list, allergen legend | `lib/fixtures/menu.ts` |
| `/taps` | `app/(public)/taps/page.tsx` | Filter bar (style, ABV slider), tap grid, "data refreshed" note | `lib/fixtures/taps.ts` |
| `/events` | `app/(public)/events/page.tsx` | View toggle (List / Calendar), upcoming list, past archive collapse | `lib/fixtures/events.ts` |
| `/events/[slug]` | `app/(public)/events/[slug]/page.tsx` | Event hero, datetime, description, ticket CTA, related events | `lib/fixtures/events.ts` (lookup by slug) |
| `/reservations` | `app/(public)/reservations/page.tsx` | Intro copy, unified inquiry form (type selector), FAQ accordion | static + `lib/fixtures/faq.ts` |
| `/gallery` | `app/(public)/gallery/page.tsx` | Masonry grid, lightbox dialog | `lib/fixtures/gallery.ts` |
| `/merch` | `app/(public)/merch/page.tsx` | Product grid (Printify-shaped), outbound link card | `lib/fixtures/merch.ts` |
| `/careers` | `app/(public)/careers/page.tsx` | "Why work here" copy, open positions list, application form | `lib/fixtures/careers.ts` |
| `/contact` | `app/(public)/contact/page.tsx` | Address card, hours, parking, Mapbox map, getting-here notes | `lib/fixtures/hours.ts`, `location.ts` |
| `/privacy` | `app/(public)/privacy/page.tsx` | Long-form legal copy (MDX-free, plain TSX with Tailwind prose) | `lib/fixtures/legal.ts` |
| `/terms` | `app/(public)/terms/page.tsx` | Long-form legal copy | `lib/fixtures/legal.ts` |

Layout file: **`app/(public)/layout.tsx`** mounts `<SiteHeader />`, `<main>`, `<SiteFooter />`, and a `<NewsletterDialog />` portal slot. The root `app/layout.tsx` continues to host `<GrainOverlay />`, fonts, and `<html>`.

404 / not-found: **`app/(public)/not-found.tsx`** — Packers-green illustration ground, gold wordmark, copper "back to home" CTA.

Route-group rationale: only one public group. No nested groups (`(public)/(legal)/`); legal pages live flat and use a shared `<LegalLayout>` section primitive internally. Keeps URL → file mapping mechanical.

---

## 2. Mock Fixtures Location

**Pick: `lib/fixtures/`** (NOT `app/__fixtures__/`).

Reasoning:
- Phase 5 replaces fixture imports with Drizzle query helpers that already live under `lib/db/` and `lib/queries/`. Keeping fixtures next to the future query layer makes the swap a one-line import change per page.
- `app/__fixtures__/` is unconventional in App Router and easy to accidentally publish as a route segment if naming drifts.
- A single `lib/fixtures/` directory is greppable: Phase 5 exit criterion ("no mock data references remain in `app/` outside `__fixtures__/`") is checked by `grep -r "lib/fixtures" app/ → empty`.

### Required files

```
lib/fixtures/
  index.ts          // re-exports everything; pages import from "@/lib/fixtures"
  types.ts          // Phase-5-compatible TypeScript types (see below)
  hero.ts           // HomeHero
  taps.ts           // Tap[]
  events.ts         // Event[] (mix of upcoming + past, slugs unique)
  menu.ts           // MenuSection[] with MenuItem[]
  hours.ts          // WeeklyHours + HoursOverride[]
  about.ts          // AboutContent block
  team.ts           // TeamMember[]
  gallery.ts        // GalleryImage[]
  merch.ts          // MerchProduct[]
  careers.ts        // Posting[]
  faq.ts            // FaqEntry[]
  instagram.ts      // IgPost[]  (4–6 placeholder squares)
  location.ts       // single object: address, lat/lng, parking notes, phone
  legal.ts          // { privacy: string, terms: string } (long MDX-like strings or arrays of paragraphs)
```

### Type contract rules

`lib/fixtures/types.ts` defines every entity. **Types must match the Phase-5 Drizzle schema shape** (camelCase keys, ISO date strings, nullable fields explicit). The frontend agent invents the types; the architect will review them against the schema spec drafted in Phase 4. Examples (binding):

- `Event`: `{ id: string; slug: string; title: string; startsAt: string; endsAt: string | null; description: string; imageUrl: string; ticketUrl: string | null; featured: boolean; tags: string[]; }`
- `Tap`: `{ id: string; name: string; brewery: string; style: string; abv: number; ibu: number | null; description: string; imageUrl: string | null; tapNumber: number; isFeatured: boolean; }`
- `MenuItem`: `{ id: string; sectionId: string; name: string; description: string; priceCents: number; allergens: ("gluten"|"dairy"|"nuts"|"shellfish"|"egg"|"soy")[]; imageUrl: string | null; available: boolean; sortOrder: number; }`
- `MerchProduct`: `{ id: string; title: string; priceCents: number; imageUrl: string; printifyUrl: string; tags: string[]; }`

Every fixture file exports a **named const** (`export const events: Event[] = [...]`) and a **helper** (`export function getEventBySlug(slug: string): Event | undefined`). Phase 5 replaces the const with `async function getEvents()` — page code awaits, so make the helpers `async` from day one if needed and `await` them in pages. Recommended pattern:

```ts
// Phase 2:
export async function getEvents(): Promise<Event[]> { return events }
// Phase 5: replace body with Drizzle query, signature unchanged.
```

This eliminates the "remove `await`" churn during the swap.

---

## 3. Global Chrome

### Header — `components/marketing/SiteHeader.tsx`

Sticky top. Translucent on hero, solid after 80px scroll. Height 72px mobile / 80px desktop.

Slots:
- Left: wordmark "District Pour Haus" in Fraunces 500, **`--color-packers-gold`** (identity, per palette rule). Wordmark links to `/`.
- Center (desktop ≥1024px): primary nav — Menu, Taps, Events, About, Gallery, Merch, Careers. Inter 500 `text-sm`, color `cream/80`, hover `--color-copper`, active route gets a 2px copper underline.
- Right: secondary CTA pair: outline "Contact" → `/contact`, primary "Reserve" → `/reservations`. Reserve uses `bg-primary` (copper) per palette rule (CTA = action = copper).
- Mobile (<1024px): hamburger icon (Lucide `menu`, 24px, cream) opens a Sheet from the right.

Scroll behavior:
- Initial state: `bg-transparent`, no border.
- After 80px scroll: `bg-background/85 backdrop-blur-md`, 1px bottom border `border` token. Transition 200ms.
- Implementation: client component, single `useScroll` listener via Framer Motion `useMotionValueEvent` (already installed). Respect `prefers-reduced-motion` by snapping instead of animating.

Brand-palette landings:
- Wordmark: **gold** (identity).
- Reserve CTA: **copper** (action).
- Active route underline: **copper** (action — user clicked there).
- "Open Now" pill inline-right of wordmark on desktop only: **Packers green** background, cream dot, "Open · Closes 11 PM" cream text. Hidden mobile.

ASCII wireframe (desktop, scrolled state):

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [DISTRICT POUR HAUS gold]  [● Open Now green]    Menu Taps Events About  │
│                                                   Gallery Merch Careers    │
│                                                          [Contact] [Reserve]│
└────────────────────────────────────────────────────────────────────────────┘
                                                                  copper ↑
```

ASCII wireframe (mobile):

```
┌──────────────────────────────────────────────┐
│  [DPH gold]                            [☰]   │
└──────────────────────────────────────────────┘
```

### Mobile nav — `components/marketing/MobileNav.tsx`

Sheet from right (existing shadcn Sheet). Width 320px. Background `card`. Contents:
- Top: close X (ghost button, hover → copper)
- Wordmark (gold)
- Full nav list, Fraunces `text-display-sm`, gap 16px, copper underline on active
- Bottom: hours card (mini), phone link (copper), address line, social row (IG / Untappd icons in cream, hover copper)
- Footer-of-sheet: "Reserve a Table" copper button full-width.

### Footer — `components/marketing/SiteFooter.tsx`

Two stacked strips:

**Strip A — main footer** (background `card`, padding `lg`):
- 4-column grid (collapses to 2 on tablet, 1 on mobile):
  1. Brand block: wordmark (gold), tagline "Our Haus is Your Haus" cream, short blurb muted
  2. Visit: address, phone (copper link), email (copper link)
  3. Explore: Menu / Taps / Events / Gallery / Merch
  4. Newsletter: short pitch + email input + copper submit; on success shows a one-line confirmation. Phase 2 = no-op server action; banner says "you're on the list — see you soon."

**Strip B — brand strip** (full-bleed, `bg-[--color-packers-green]`, height 64px, mobile 56px):
- Center: gold wordmark micro + "Est. Wisconsin" cream eyebrow.
- Right (desktop): social icon row in gold.
- Left (desktop): "© {year} District Pour Haus · Privacy · Terms" cream/80 — Privacy/Terms links use gold on hover (per palette rule: links in green surfaces use gold or cream, never bright-green).

This is the only place Packers green appears as a full-bleed surface on every page — it is the "place identity" anchor at the bottom of every visit.

ASCII wireframe (desktop footer):

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─Strip A (card bg)──────────────────────────────────────────────┐  │
│ │  [DPH gold]      VISIT          EXPLORE         NEWSLETTER     │  │
│ │  tagline cream   address        Menu            ▢ email_____   │  │
│ │  blurb muted     phone copper   Taps            [Subscribe]    │  │
│ │                  email copper   Events          (copper btn)   │  │
│ │                                 Gallery / Merch                 │  │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌─Strip B (Packers green full-bleed)─────────────────────────────┐  │
│ │ © 2026 DPH · Privacy · Terms   [DPH gold] Est. Wisconsin   ◯◯◯ │  │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Per-Page Section Breakdown

Sections listed in render order. Each row = single section primitive (uses `<Section>` from layout primitives unless noted). Palette family in **bold** at end.

### `/` — Home

1. **Hero** — full-bleed (`bg-base`), Fraunces `text-display-xl` headline "Our Haus is Your Haus", cream eyebrow with gold underline rule, copper "See What's Pouring" + outline "Reserve" CTA pair. Subtle parallax behind text via `<motion.div>` (respects reduced-motion). **Neutral + copper + gold eyebrow.**
2. **Tap-counter strip** — full-bleed `bg-card`, single row: large tabular-num "24 / 48 pours flowing" cream + small "live from Untappd · refreshes ~5 min" muted note. Visual prep for Phase 6. **Neutral + copper for the number.**
3. **Upcoming events strip** — section heading "What's Happening", horizontal scroll on mobile / 3-up grid desktop using `<EventCard />` (see §5). One card may carry a gold "Featured" pill. **Neutral cards; gold pill = featured identity.**
4. **Featured menu** — 4 menu items in a 2x2 grid using `<MenuItem variant="featured" />`. Heading "From the Kitchen", copper "See full menu →" link out. **Neutral + copper link.**
5. **Hours / Location card** — 2-col split: `<HoursCard />` left, `<MapBlock />` right. Open-now pill at top of HoursCard is **Packers green**. **Neutral surface, green pill.**
6. **Instagram slot** — heading "Follow @districtpourhaus", 6-tile grid (square placeholders), copper "Open on Instagram" outbound link. **Neutral + copper link.**
7. **Newsletter CTA** — full-bleed `bg-card` with copper top accent rule, large Fraunces "Pour-Over News, monthly", inline email + copper subscribe button. **Neutral + copper button.**

### `/about`

1. **Page hero** — display-md headline "Our Haus is Your Haus", lead paragraph, gold eyebrow underline. **Neutral + gold eyebrow.**
2. **Story** — long-form 2-column text block (Tailwind prose-style classes, hand-applied). **Neutral.**
3. **Self-pour explainer** — 3-step illustrated row: 1) Get an RFID card, 2) Tap and pour, 3) Settle up. Use Lucide icons (`credit-card`, `beer`, `receipt`). Copper step numerals. **Neutral + copper numerals.**
4. **Team grid** — `<TeamCard />` grid 3-up desktop / 2-up mobile, headshots placeholder. **Neutral.**
5. **Values strip** — 4 short value cards (Wisconsin, Craft, Community, Game Day). The Game Day card uses **`bg-[--color-packers-green]`** with gold inner accents — only this card. The other three are neutral. Explicitly uses the "Community / locals dividers" palette rule. **Neutral + 1 green card.**
6. **CTA strip** — "Come see us" copper button to `/contact`. **Copper.**

### `/menu`

1. **Page hero** — display-md "Food Menu", short note "Drinks are on the Taps page." Copper link out to `/taps`. **Neutral + copper link.**
2. **Section tabs** — shadcn Tabs primitive. Triggers: Shareables / Mains / Sides / Desserts. Active = copper underline (per Phase 1 spec). **Neutral + copper underline.**
3. **Menu list** — for active tab, render `<MenuItem variant="list" />` rows. Each row: name (Fraunces), price (Inter tabular), description (muted), allergen chips (neutral outline badges). **Neutral.**
4. **Allergen legend** — 6 small chips with abbreviations + tooltip. **Neutral.**
5. **Footer note** — "Menu may vary. Ask staff about allergens." muted. **Neutral.**

### `/taps`

1. **Page hero** — display-md "On Tap", live indicator dot (Packers green) + "X of 48 flowing", "Updated ~5 min" muted. **Neutral + green dot.**
2. **Filter bar** — `<TapFilters />`: style multi-select (shadcn DropdownMenu), ABV range slider (custom, neutral with copper handle), search input. Sticky below header on scroll. **Neutral + copper handle.**
3. **Tap grid** — 3-up desktop / 2-up tablet / 1-up mobile of `<TapCard />`. Featured taps carry a **gold "Tap Takeover"** pill (palette rule: gold = featured identity). **Neutral + gold pill.**
4. **Empty state** — when filters return zero, neutral copy + "Clear filters" copper ghost button. **Neutral + copper.**
5. **Bottom note** — "Live data from Untappd · refreshes every ~5 minutes" muted. **Neutral.**

### `/events`

1. **Page hero** — display-md "Events". Toggle pill group: List / Calendar. **Neutral + copper active toggle.**
2. **Filter row** — month select, tag chips (Live Music / Trivia / Game Day / Private). Game Day chip when active = **Packers green background**. **Neutral + green active state for Game Day only.**
3. **Upcoming list** — `<EventCard />` in 2-col grid; featured first with gold pill. **Neutral + gold pill.**
4. **Calendar view** — month grid (custom, neutral). Days with events get a copper dot indicator. **Neutral + copper dots.**
5. **Past events** — collapsed accordion "Archive (12)" using base-ui Accordion. **Neutral.**

### `/events/[slug]`

1. **Event hero** — full-width image, Fraunces display-lg title overlay, datetime, location. **Neutral with image; gold "Featured" pill if applicable.**
2. **Body** — long-form description, 2-col layout with sticky sidebar (ticket CTA copper, share row, add-to-calendar links).
3. **Related events** — 3-up `<EventCard />`. **Neutral.**

### `/reservations`

1. **Page hero** — display-md "Reserve · Inquire", short intro paragraph. **Neutral.**
2. **Inquiry form** — single unified `<InquiryForm />` (see §6). Card-bg surface. **Neutral + copper submit.**
3. **FAQ accordion** — 6–8 entries. **Neutral.**
4. **Visit-us strip** — phone + address mini card, copper phone link. **Neutral + copper link.**

### `/gallery`

1. **Page hero** — display-md "Gallery". **Neutral.**
2. **Masonry grid** — CSS columns-based masonry (no JS lib), 3-col desktop / 2-col tablet / 1-col mobile, gap 8px. Each cell = `<button>` opening lightbox Dialog. **Neutral.**
3. **Lightbox** — shadcn Dialog overlay; image + caption, left/right arrow nav (keyboard `←/→`), close (Esc). **Neutral.**

### `/merch`

1. **Page hero** — display-md "Merch", short blurb, copper outbound "Open Pop-Up Store" button. **Neutral + copper button.**
2. **Promo card** — single full-width card styled like the exterior sign: **`bg-[--color-packers-green]`**, gold wordmark, cream copy "Sign-styled drops · limited runs." This is the explicit "Merch promo card" palette case. **Green + gold (sign).**
3. **Product grid** — 4-up desktop / 2-up mobile of `<MerchProductCard />`. Cards are neutral. Each card click is an outbound link to Printify (Phase 2: same placeholder URL). **Neutral cards.**
4. **Returns note** — muted small print. **Neutral.**

### `/careers`

1. **Page hero** — display-md "Work With Us", lead paragraph "We're hiring people who give a damn." **Neutral.**
2. **Why us strip** — 3-card row (Pay / Tips / Vibe). **Neutral.**
3. **Open positions** — list of `<PositionCard />`; click expands inline OR jumps to anchor on the same page. **Neutral + copper "Apply" link.**
4. **Application form** — `<CareersForm />` (see §6) — card-bg surface. Resume input is a file `<Input type="file">` (Phase 7 wires storage; Phase 2 just collects metadata). **Neutral + copper submit.**

### `/contact`

1. **Page hero** — display-md "Find Us". **Neutral.**
2. **Location card** — 2-col: address + phone + email (copper links) left, `<HoursCard />` right with **green** Open Now pill. **Neutral + green pill + copper links.**
3. **Map block** — `<MapBlock />`: Mapbox GL JS embed centered on lat/lng. See §10 for fallback rule. **Neutral.**
4. **Getting here** — parking notes, transit, accessibility. **Neutral.**
5. **Game-day banner** (conditional, only renders when fixture flag `isGameDay === true`) — full-bleed **`bg-[--color-packers-green]`** strip with gold "Packers Tonight · Kickoff 7:20" eyebrow. Explicitly uses the game-day badge palette rule. **Green + gold.**

### `/privacy`, `/terms`

1. **Page hero** — display-sm title, last-updated muted date. **Neutral.**
2. **Long-form body** — Tailwind typography-equivalent (apply `text-base`, `text-lg` headers, link `text-primary`). Single column, `max-w-prose`. **Neutral + copper links.**

---

## 5. Reusable Section Components

All under `components/marketing/`. One file per component, default export named, prop types co-located.

| Component | Path | Props (load-bearing) | Consumed by |
|---|---|---|---|
| `SiteHeader` | `components/marketing/SiteHeader.tsx` | — | layout |
| `SiteFooter` | `components/marketing/SiteFooter.tsx` | — | layout |
| `MobileNav` | `components/marketing/MobileNav.tsx` | `open: boolean; onOpenChange: (b) => void` | SiteHeader |
| `Wordmark` | `components/marketing/Wordmark.tsx` | `size?: "sm" \| "md" \| "lg"; tone?: "gold" \| "cream"` | header, footer, mobile nav, 404 |
| `OpenStatusPill` | `components/marketing/OpenStatusPill.tsx` | `hours: WeeklyHours; overrides: HoursOverride[]` | header, contact, home |
| `HoursCard` | `components/marketing/HoursCard.tsx` | `hours: WeeklyHours; overrides: HoursOverride[]; variant?: "default" \| "compact"` | home, contact, mobile nav |
| `EventCard` | `components/marketing/EventCard.tsx` | `event: Event; variant?: "default" \| "featured" \| "compact"` | home, events, event detail |
| `TapCard` | `components/marketing/TapCard.tsx` | `tap: Tap` | taps |
| `TapFilters` | `components/marketing/TapFilters.tsx` | `taps: Tap[]; onChange: (filtered) => void` | taps (client component) |
| `MenuItem` | `components/marketing/MenuItem.tsx` | `item: MenuItem; variant?: "list" \| "featured"` | home, menu |
| `MenuSectionTabs` | `components/marketing/MenuSectionTabs.tsx` | `sections: MenuSection[]` | menu |
| `MerchProductCard` | `components/marketing/MerchProductCard.tsx` | `product: MerchProduct` | merch |
| `GalleryGrid` | `components/marketing/GalleryGrid.tsx` | `images: GalleryImage[]` | gallery |
| `Lightbox` | `components/marketing/Lightbox.tsx` | `images, index, open, onOpenChange` | gallery |
| `MapBlock` | `components/marketing/MapBlock.tsx` | `lat: number; lng: number; zoom?: number; markerLabel?: string` | contact, home |
| `NewsletterCTA` | `components/marketing/NewsletterCTA.tsx` | `variant?: "footer" \| "section"` | footer, home |
| `InquiryForm` | `components/marketing/forms/InquiryForm.tsx` | `defaultType?: InquiryType` | reservations |
| `CareersForm` | `components/marketing/forms/CareersForm.tsx` | `positions: Posting[]; defaultPositionId?: string` | careers |
| `TeamCard` | `components/marketing/TeamCard.tsx` | `member: TeamMember` | about |
| `PositionCard` | `components/marketing/PositionCard.tsx` | `posting: Posting; onApply: (id) => void` | careers |
| `FaqAccordion` | `components/marketing/FaqAccordion.tsx` | `entries: FaqEntry[]` | reservations |
| `GameDayBanner` | `components/marketing/GameDayBanner.tsx` | `kickoff: string; opponent: string` | contact (conditional), event detail |
| `PageHero` | `components/marketing/PageHero.tsx` | `eyebrow?: string; title: string; lead?: string; align?: "left" \| "center"` | every interior page hero |
| `LegalPage` | `components/marketing/LegalPage.tsx` | `title: string; updatedAt: string; children` | privacy, terms |
| `InstagramSlot` | `components/marketing/InstagramSlot.tsx` | `posts: IgPost[]` | home |
| `SectionHeading` | `components/marketing/SectionHeading.tsx` | `eyebrow?: string; children` | every page |

All client-only components (filters, lightbox, mobile nav, forms, scroll-aware header) must declare `"use client"` at the top. Everything else renders on the server.

Reusable Section primitive `<Section>` is already shipped; do not re-implement.

---

## 6. Forms (unwired)

### Stack
- `react-hook-form` + `zod` resolver — both already in `package.json`.
- Shadcn `Input`, `Textarea`, `Select`, `Label` already exist. Build a thin `<FormField>` wrapper that pairs Label + control + inline error text (cream label, destructive error, `aria-describedby`).

### Server actions (no-op shape)

Create `app/(public)/_actions/inquiries.ts` and `app/(public)/_actions/careers.ts`. Each exports `async function submit(prevState, formData)` typed for `useActionState`. In Phase 2 the body is:

```ts
"use server"
// validate with zod, on failure return { ok: false, fieldErrors }
// on success: await new Promise(r => setTimeout(r, 600)); return { ok: true, message: "..." }
```

No DB writes, no Resend calls. Form re-renders into a success banner after the action returns `ok: true`. The banner says exactly:

- Inquiry: **"Thanks — we'll email you back within one business day."**
- Careers: **"Thanks for applying. We'll be in touch if there's a match."**

### Inquiry form (`<InquiryForm />`)

Fields:

| Field | Type | Validation |
|---|---|---|
| `type` | Select: `reservation` / `private-event` / `press` / `general` | required |
| `name` | text | required, 2–80 chars |
| `email` | email | required, valid email |
| `phone` | tel | required if type=`reservation` or `private-event`, else optional |
| `partySize` | number | required if type=`reservation`; 1–50 |
| `preferredDate` | date | required if type=`reservation` or `private-event` |
| `preferredTime` | time | required if type=`reservation` |
| `message` | textarea | required, 10–2000 chars |
| `consent` | checkbox | required true ("I'm okay being contacted about this inquiry") |

Conditional-required fields use zod `superRefine`. Type selector drives which fields are visible (animated height collapse for hidden ones, respects reduced-motion).

Submit: copper full-width on mobile, auto-width on desktop. Loading state per Phase 1 spec (spinner replaces label, preserves width).

### Careers form (`<CareersForm />`)

| Field | Type | Validation |
|---|---|---|
| `positionId` | Select (from `positions` fixture) | required |
| `name` | text | required |
| `email` | email | required |
| `phone` | tel | required |
| `link` | url | optional (portfolio / LinkedIn) |
| `availability` | textarea | required, 5–500 chars |
| `coverLetter` | textarea | optional, max 2000 chars |
| `resume` | file | required; accept `.pdf,.doc,.docx`; max 5 MB; Phase 2 reads the `File` and discards |
| `consent` | checkbox | required true |

Resume `input[type=file]` is styled per Phase 1 input tokens; show selected filename and size in muted text.

### Form a11y rules (binding)

- Every input wrapped in `<fieldset>` when grouped (e.g. reservation date+time → "When"). Each fieldset has a visible `<legend>`.
- Every label is associated via `htmlFor` / `id`.
- Error text is `id`'d and referenced via `aria-describedby` on the input.
- `aria-invalid="true"` on invalid inputs.
- Submit button has `aria-busy` while pending.
- Required fields are marked with an asterisk **and** `aria-required="true"`. Asterisk color: copper.

---

## 7. SEO Metadata Strategy

Every public page exports either a static `metadata` object or `generateMetadata` (for dynamic `[slug]` routes).

### Title format

```
{Page} — District Pour Haus
```

Home is the exception: title = `"District Pour Haus — Our Haus is Your Haus"`.

Implementation: define a helper `lib/seo.ts` exposing:

```ts
export function pageMetadata(opts: { title: string; description: string; path: string; ogImage?: string }): Metadata
```

It builds the title, sets `description` (130–155 chars target; truncate hard at 160), `openGraph` (type `website`, locale `en_US`, siteName `District Pour Haus`, url absolute, single OG image), `twitter` (`summary_large_image`), and `alternates.canonical`.

### OG image stub

Single placeholder: `public/og/default.png` (1200×630, neutral background + gold wordmark, content team produces). Every page references this same image in Phase 2. Dynamic per-event OG images are Phase 8.

### Per-page descriptions (content agent writes; architect approves length)

- Home: "Wisconsin self-pour taproom with 48 craft taps, scratch kitchen, and live events. Our Haus is Your Haus."
- About: "How District Pour Haus came to be — Wisconsin roots, RFID self-pour, craft beer first."
- Menu: "Scratch kitchen menu — shareables, mains, sides, desserts. Pairs with whatever you pour."
- Taps: "Live tap list from our 48-tap wall. Filter by style or ABV — updated every five minutes."
- Events: "Live music, trivia, game-day specials, and private events at District Pour Haus."
- Reservations: "Reserve a table, plan a private event, or send us a note."
- Gallery: "Inside the Haus — taproom, kitchen, events."
- Merch: "Limited-run District Pour Haus merch. Wear the Wisconsin."
- Careers: "Hiring people who give a damn. Open roles at District Pour Haus."
- Contact: "Find us, call us, park easy. Open seven days a week."
- Privacy: "Privacy policy for District Pour Haus."
- Terms: "Terms of use for District Pour Haus."

### Other metadata rules

- All public pages: `robots: { index: true, follow: true }`.
- `/styleguide` keeps `robots: { index: false }`.
- Phase 2 does NOT ship `sitemap.ts` / `robots.ts` — that's Phase 8. Do not add early.
- `viewport` is set once in root layout (already inherits).

---

## 8. Build Order

Recommended execution sequence for `dph-frontend`. Items on the same row can run in parallel agents.

| Wave | Tasks |
|---|---|
| **W1 — foundations** | Delete `app/page.tsx` (Next.js starter). Create `app/(public)/layout.tsx` shell. Build `<Wordmark>`, `<SectionHeading>`, `<PageHero>`. Stand up `lib/fixtures/` skeleton with `types.ts` and stub exports (empty arrays + async helpers). Build `lib/seo.ts`. |
| **W2 — chrome** | `<SiteHeader>`, `<MobileNav>`, `<SiteFooter>`, `<NewsletterCTA>`, `<OpenStatusPill>`, `<HoursCard>`. These block every page; must land before pages. |
| **W3 — shared cards** (parallel) | `<EventCard>` · `<TapCard>` · `<MenuItem>` · `<MerchProductCard>` · `<TeamCard>` · `<PositionCard>` · `<FaqAccordion>` · `<GameDayBanner>` |
| **W4 — page implementations** (parallel after W2+W3) | `/` · `/about` · `/menu` · `/merch` · `/gallery` · `/careers` (form pending W5) · `/privacy` · `/terms` |
| **W5 — interactive pages** (parallel) | `/taps` (needs `<TapFilters>`) · `/events` + `/events/[slug]` · `/reservations` (needs `<InquiryForm>`) · `/contact` (needs `<MapBlock>`) · `/careers` form completion |
| **W6 — content + SEO pass** | `dph-content` fills placeholder copy, descriptions, OG copy. `dph-frontend` wires `pageMetadata()` on every route. |
| **W7 — exit-criteria pass** | `dph-qa` runs Lighthouse, axe, mobile sweep. Fix list bubbles back to frontend. |

Critical path: W1 → W2. Everything else parallelizes.

---

## 9. Phase 2 Exit Criteria

From `PHASES.md`:

- [ ] All routes (Home, About, Menu, Taps, Events, Reservations, Gallery, Merch, Careers, Contact, Privacy, Terms, Events/[slug], 404) render on mobile + desktop with placeholder data.
- [ ] No console errors. No layout shift (CLS < 0.05 on every page).
- [ ] Lighthouse Performance ≥ 90 on each public page (run on a production build, `next start`).
- [ ] Content reviewed for typos and brand voice (content agent sign-off).

Architect-added:

- [ ] Zero references to `app/page.tsx` outside the route group — old starter file is deleted.
- [ ] Zero imports of `@/lib/db`, `@/lib/untappd`, `@/lib/printify`, `@/lib/resend` in `app/(public)/`. Greppable check.
- [ ] Every page imports fixtures from `@/lib/fixtures` (single barrel). Greppable: `grep -r "from \"@/lib/fixtures" app/(public)`.
- [ ] Every fixture entity exported as both a const **and** an async getter, signature matches Phase-5-target shape.
- [ ] Every form (`InquiryForm`, `CareersForm`, `NewsletterCTA`) has labeled fieldsets where grouped, every input has an `<label htmlFor>`, axe-core passes on `/reservations` and `/careers`.
- [ ] Submitting either form returns the success banner copy verbatim (§6) within ~600ms simulated latency.
- [ ] `<SiteHeader>` and `<SiteFooter>` use the brand palette per `AGENTS.md`: copper for CTAs, gold for wordmark, green only on the footer brand strip and the Open Now pill, and the conditional game-day banner.
- [ ] Reduced-motion: `prefers-reduced-motion: reduce` disables hero parallax, sticky-header animation, and form conditional-collapse animation. Verify with DevTools.
- [ ] Every page exports either `metadata` or `generateMetadata`. Title format `{Page} — District Pour Haus` enforced.
- [ ] `npm run typecheck` clean. `npm run lint` clean.
- [ ] `/styleguide` still renders and still passes Phase 1 exit criteria — Phase 2 has not regressed the design system.

---

## 10. Open Questions for the Orchestrator

The architect's calls below are the defaults if no further direction comes back. Override if the user disagrees.

1. **Mapbox API key for `/contact`.**
   Default: ship `<MapBlock>` reading `NEXT_PUBLIC_MAPBOX_TOKEN`. If unset (Phase 2 case), render a styled neutral placeholder card with the address, a static map image (Mapbox Static Images API requires no JS key but does still need a token) **or** a CSS-only fallback diagram. Decision: use the CSS-only fallback in Phase 2 (no token spend yet); MapBlock accepts a `token?: string` prop, falls back when absent. Get a token in Phase 6 alongside other integration creds.

2. **Instagram embed strategy for home + footer.**
   Default: do NOT use the IG oEmbed widget (heavy, brittle, needs Meta app review). Render 6 square placeholders (neutral cards with a gold IG icon center) linking out to the profile URL. Phase 8/post-MVP can add a server-fetched IG feed via Basic Display API if owner wants it.

3. **Gallery image source.**
   Default: use 12–16 placeholder JPGs the content team supplies in `public/gallery/` (flat-color cards are too brand-thin). Until photo set lands, use desaturated Unsplash CC0 taproom shots committed under `public/gallery/placeholder-*.jpg`. Frontend can ship the grid against placeholders, content agent swaps file paths later.

4. **`/events/[slug]` — do we list past events with their own pages?**
   Default: yes, but past events get a small "Past event" badge and the ticket CTA hides. Slugs stay live forever (good for SEO + sharing).

5. **Reservations real submit hook.**
   Confirmed: Phase 2 = no-op server action returning success after 600ms. Phase 7 wires DB write + Resend email. The form ships behind a feature flag? No — same form, the server action body is swapped in Phase 7. Cleaner.

6. **Mobile hamburger icon color.**
   Default: cream (foreground), hover copper. Not gold — gold is reserved for the wordmark and game-day, not for chrome.

7. **Newsletter signup target.**
   Phase 2: no-op success. Phase 7 writes to `subscribers` table. No external Mailchimp/ConvertKit.

8. **Plausible analytics script.**
   Defer to Phase 8 per `PHASES.md`. Do not install in Phase 2.

9. **`/merch` outbound URL.**
   Single placeholder string `https://districtpourhaus.printify.me` in `lib/fixtures/merch.ts`. Owner confirms real store URL before Phase 6 swap.

10. **OG image stub.**
    Content agent produces one 1200×630 PNG: dark `--color-brand-base` background, centered gold wordmark, cream tagline. Committed to `public/og/default.png` before W6.

---

End of spec.
