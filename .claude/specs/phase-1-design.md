# Phase 1 — District Pour Haus Design System Spec

Dark-only. Tailwind v4 `@theme` in `app/globals.css`. shadcn v4 semantic names. OKLCH everywhere. Implementation target: `dph-frontend`.

---

## 1. Color Palette — raw tokens (`@theme`)

### Brand anchors

| Token | OKLCH | Source hex | Role |
|---|---|---|---|
| `--color-brand-base` | `oklch(0.158 0.002 286)` | `#0E0E0F` | App background, deepest surface. Renamed from `--color-base`: Tailwind v4 would generate `.text-base { color: ... }` colliding with the built-in font-size utility. |
| `--color-cream` | `oklch(0.949 0.014 79)` | `#F5EFE6` | Primary foreground / type |
| `--color-copper` | `oklch(0.648 0.130 47)` | `#C97B4A` | Brand accent, primary CTAs |
| `--color-copper-hover` | `oklch(0.610 0.128 46)` | — | Copper hover (≈5% darker L, chroma held) |
| `--color-copper-active` | `oklch(0.572 0.124 45)` | — | Copper pressed (≈8% darker L) |

### Neutral scale (dark-weighted — extra granularity at the low end)

| Token | OKLCH | Use |
|---|---|---|
| `--color-neutral-50` | `oklch(0.970 0.004 80)` | Highest contrast type on dark (rarely needed; cream usually wins) |
| `--color-neutral-100` | `oklch(0.920 0.006 80)` | Cream-adjacent text |
| `--color-neutral-200` | `oklch(0.850 0.008 80)` | Secondary type |
| `--color-neutral-300` | `oklch(0.740 0.010 80)` | Tertiary type |
| `--color-neutral-400` | `oklch(0.620 0.010 80)` | Muted foreground (body small print) |
| `--color-neutral-500` | `oklch(0.500 0.008 80)` | Disabled text, placeholders |
| `--color-neutral-600` | `oklch(0.400 0.006 80)` | Stronger borders / divider on light surfaces |
| `--color-neutral-700` | `oklch(0.310 0.005 286)` | Default border on dark |
| `--color-neutral-800` | `oklch(0.235 0.004 286)` | Hover surface, popovers |
| `--color-neutral-900` | `oklch(0.198 0.003 286)` | Card / elevated surface |
| `--color-neutral-950` | `oklch(0.140 0.002 286)` | Below-base wells (rarely; below `base`) |

Hue intent: 80 in the upper range carries a tiny warm bias (cream-pulled); 286 in the lower range is near-neutral with a barely perceptible cool to read as "soot black" rather than brown.

### Semantic raw

| Token | OKLCH | Notes |
|---|---|---|
| `--color-destructive` | `oklch(0.620 0.150 32)` | Warm terracotta-red. Sits next to copper without clashing. AA-passes on `base`. Raised from 0.560 to 0.620 L to clear WCAG AA on destructive-on-background pair. |
| `--color-ring` | `oklch(0.720 0.135 50)` | Copper-tinted, ~10% lighter than copper accent so the ring reads distinct from a copper fill. |

### Contrast verification (WCAG, computed against `--color-base`)

| Pair | Ratio | AA body (4.5) | AA large/UI (3.0) |
|---|---|---|---|
| `cream` on `base` | 16.4:1 | pass | pass |
| `copper` on `base` | 5.6:1 | pass | pass |
| `neutral-400` → `oklch(0.700 0.010 80)` (muted-fg) on `base` | 7.28:1 | pass | pass |
| `neutral-400` → `oklch(0.700 0.010 80)` (muted-fg) on `card` | 6.80:1 | pass | pass |
| `neutral-500` (disabled) on `base` | 3.4:1 | fail body / pass large | disabled-only, acceptable |
| `cream` on `copper` (fg on primary fill) | 2.9:1 | fail | borderline |
| `base` on `copper` (fg on primary fill) | 5.7:1 | pass | pass |
| `destructive` on `base` | 5.3:1 | pass | pass |
| `base` on `destructive` (destructive button label) | 5.00:1 | pass | pass |
| `ring` on `base` | 6.9:1 | pass | pass |

**Adjustment:** Cream-on-copper fails AA at 2.9:1, so primary button foreground must be `--color-base` (not cream). Cream-on-destructive fails AA at 3.35:1 for standard-size button labels (4.5:1 minimum applies), so destructive button foreground also uses `--color-brand-base`. All semantic mappings below honor this.

---

## 2. Semantic Mappings — shadcn → raw

| shadcn token | Maps to | Reasoning |
|---|---|---|
| `--background` | `--color-brand-base` | App canvas |
| `--foreground` | `--color-cream` | Default type |
| `--card` | `--color-neutral-900` | Lifted off `base` for surface separation |
| `--card-foreground` | `--color-cream` | — |
| `--popover` | `--color-neutral-800` | One step brighter than card; pops on overlap |
| `--popover-foreground` | `--color-cream` | — |
| `--primary` | `--color-copper` | Brand CTA |
| `--primary-foreground` | `--color-base` | Required by contrast table above |
| `--secondary` | `--color-neutral-900` | Quiet button fill |
| `--secondary-foreground` | `--color-cream` | — |
| `--muted` | `--color-neutral-900` | Subtle surface backgrounds (skeletons, chips) |
| `--muted-foreground` | `oklch(0.700 0.010 80)` (between neutral-300 and neutral-400; raised from 0.620 to clear AA on card surface) | Captions, helper text |
| `--accent` | `--color-copper` | Hover/active highlight color (same as primary; brand only has one accent) |
| `--accent-foreground` | `--color-base` | — |
| `--destructive` | `--color-destructive` | — |
| `--destructive-foreground` | `--color-brand-base` | Mirrors primary-foreground pattern; cream-on-destructive fails AA (3.35:1) for standard button labels — base-on-destructive clears 5.00:1. |
| `--border` | `--color-neutral-700` | Default 1px borders |
| `--input` | `--color-neutral-900` | Form field surface |
| `--ring` | `--color-ring` | Focus ring (copper-tinted, distinct from fill) |

---

## 3. Typography Scale

### Fonts

- Display: **Fraunces** (variable), exposed as `--font-display`. Axes: `opsz` auto (per CSS `font-optical-sizing: auto`), `SOFT 50` confirmed, `wght 400/500`, italic enabled for emphasis runs.
- Body: **Inter** (variable), exposed as `--font-sans`. Axes: `wght 400/500/600`, `slnt 0`.

### Step scale (fluid, `clamp(min, vw-based, max)`)

| Token | Min → Max | Line-height | Tracking | Default weight | Role |
|---|---|---|---|---|---|
| `text-xs` | `clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)` | 1.4 | `0.02em` | 500 | Labels, microcopy, captions |
| `text-sm` | `clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem)` | 1.5 | `0.01em` | 400 | Helper text, table cells |
| `text-base` | `clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)` | 1.6 | `0` | 400 | Body |
| `text-lg` | `clamp(1.125rem, 1.07rem + 0.25vw, 1.1875rem)` | 1.55 | `0` | 400 | Lead paragraph |
| `text-xl` | `clamp(1.25rem, 1.18rem + 0.35vw, 1.375rem)` | 1.45 | `-0.005em` | 500 | Subheads (Inter) |
| `text-2xl` | `clamp(1.5rem, 1.4rem + 0.5vw, 1.75rem)` | 1.35 | `-0.01em` | 500 | Section labels, card titles |

### Display scale (Fraunces, `--font-display`)

| Token | Min → Max | Line-height | Tracking | Weight | Role |
|---|---|---|---|---|---|
| `text-display-sm` | `clamp(1.75rem, 1.5rem + 1.2vw, 2.25rem)` | 1.15 | `-0.015em` | 500 | Card hero titles, smaller section heads |
| `text-display-md` | `clamp(2.25rem, 1.9rem + 1.8vw, 3rem)` | 1.1 | `-0.02em` | 500 | Page H1 on interior routes |
| `text-display-lg` | `clamp(3rem, 2.4rem + 3vw, 4.5rem)` | 1.05 | `-0.025em` | 400 | Section heroes |
| `text-display-xl` | `clamp(3.75rem, 2.8rem + 4.8vw, 6.5rem)` | 1.0 | `-0.03em` | 400 | Homepage hero, tagline plate |

### Per-role guidance

- Display always uses Fraunces; italic variants reserved for single-word emphasis ("*your* haus") or pull-quotes.
- Body uses Inter at 400; never set Inter below 400.
- UI (buttons, tabs, labels) uses Inter 500; nav-active and badge text use 600.
- Numerals: enable `font-variant-numeric: tabular-nums` for tap counters, prices, hours.

---

## 4. Component Variants & States

All token references below use the shadcn semantic name unless a raw token is required.

### Button

| Variant | Default | Hover | Active | Focus-visible | Disabled |
|---|---|---|---|---|---|
| `default` | bg `primary`, text `primary-foreground` | bg `--color-copper-hover` | bg `--color-copper-active` | ring 2px `ring`, offset 2px on `background` | opacity 0.5, cursor not-allowed, no hover |
| `secondary` | bg `secondary`, text `secondary-foreground`, border `border` | bg `--color-neutral-800` | bg `--color-neutral-700` | ring as above | same |
| `outline` | bg transparent, border `border`, text `foreground` | bg `--color-neutral-900` | bg `--color-neutral-800` | ring as above | same |
| `ghost` | bg transparent, text `foreground` | bg `--color-neutral-900` | bg `--color-neutral-800` | ring as above | same |
| `destructive` | bg `destructive`, text `destructive-foreground` | bg destructive at L−0.04 | bg destructive at L−0.07 | ring as above | same |
| `link` | text `primary`, underline-offset 4px, decoration-color `primary`/40 | decoration-color `primary` (full) | text `--color-copper-active` | underline always; ring optional | opacity 0.5 |

**Loading state:** all variants — replace label with spinner (Lucide `loader-circle`, animate-spin), preserve original width, `aria-busy="true"`, `disabled` semantics.

**Sizes**

| Size | Height | Padding-x | Text | Icon size |
|---|---|---|---|---|
| `sm` | 32px | 12px | `text-sm` | 16px |
| `default` | 40px | 16px | `text-sm` | 18px |
| `lg` | 48px | 24px | `text-base` | 20px |
| `icon` | 40px square | 0 | — | 20px |

### Input / Textarea

| State | Spec |
|---|---|
| Default | bg `input`, border 1px `border`, text `foreground`, placeholder `muted-foreground`, radius `--radius-md` (8px), padding-x 12px, h 40px (textarea: min-h 96px) |
| Hover (non-focus) | border `--color-neutral-600` |
| Focus-visible | border `ring`, ring 2px `ring` at 35% opacity (`oklch(... / 0.35)`), no offset |
| Disabled | opacity 0.5, bg `--color-neutral-900`, cursor not-allowed |
| Invalid (`aria-invalid="true"`) | border `destructive`, focus ring `destructive` at 35% |
| Read-only | bg `--color-neutral-950`, text `muted-foreground` |

### Card

| Variant | Spec |
|---|---|
| `default` | bg `card`, border 1px `border`, radius `--radius-lg` (12px), padding 24px |
| `elevated` | same + 1px top-edge gradient line (`linear-gradient(90deg, transparent 0%, oklch(0.648 0.130 47 / 0.10) 50%, transparent 100%)`) implemented as a `::before` pseudo or absolutely-positioned 1px div — copper-tinted inset highlight, gives the "warm taproom edge" |
| `interactive` | adds hover: border `--color-neutral-600`, translate-y `-2px`, transition 250ms ease-out |

### Badge

| Variant | Spec |
|---|---|
| `default` | bg `primary`, text `primary-foreground`, `text-xs` 600, padding 4px 10px, radius full |
| `secondary` | bg `--color-neutral-800`, text `foreground` |
| `outline` | bg transparent, border 1px `border`, text `foreground` |
| `destructive` | bg `destructive`, text `destructive-foreground` |

### Tabs

- Trigger row: 1px bottom border `border`, gap 24px.
- Trigger default: text `muted-foreground`, padding-y 12px, no bg.
- Trigger hover: text `foreground`.
- Trigger active: text `foreground`, 2px copper underline (`primary`) flush with the row border, animated `transform: translateX` between triggers (300ms, ease defined in §6).
- No pill / no filled background. Underline only.
- Focus-visible: ring 2px `ring`, radius 4px around trigger label.

### Dialog / Sheet

| Element | Spec |
|---|---|
| Overlay | `rgba(0,0,0,0.70)`, backdrop-blur 4px, fade 200ms |
| Content (Dialog) | bg `card`, border 1px `border`, radius `--radius-lg`, padding 32px, max-w 32rem default, shadow `0 24px 60px -20px oklch(0 0 0 / 0.6)` |
| Content (Sheet) | bg `card`, border-l 1px `border`, padding 24px, slide 280ms |
| Close button | Lucide `x` 20px, ghost-button styling; on hover, icon color shifts to `primary` (copper) |
| Title | `text-display-sm` Fraunces |
| Description | `text-sm` `muted-foreground` |

### Dropdown menu

| Element | Spec |
|---|---|
| Surface | bg `popover`, border 1px `border`, radius `--radius-md`, padding 4px, shadow as Dialog/2 |
| Item default | text `popover-foreground`, padding 8px 12px, radius 6px, `text-sm` |
| Item hover/highlighted | bg `--color-neutral-900`, text `popover-foreground` |
| Item active/selected | bg `--color-neutral-900`, text `primary` (copper), leading `check` icon 16px |
| Separator | 1px `border`, my 4px |
| Disabled item | opacity 0.5, no hover |

---

## 5. Layout Primitives — API declarations

### `Container`

- Props: `size?: "sm" | "md" | "lg" | "xl" | "full"` (default `lg`), `as?: ElementType`.
- Max-widths: sm `40rem`, md `48rem`, lg `72rem`, xl `80rem`, full `100%`.
- Horizontal padding: 16px mobile, 24px ≥640px, 32px ≥1024px. Centered (`mx-auto`).

### `Section`

- Props: `pad?: "sm" | "md" | "lg"` (default `md`), `bg?: "base" | "card" | "muted"`, `as?: ElementType` (default `section`).
- Vertical padding: sm `clamp(2.5rem, 6vw, 4rem)`, md `clamp(4rem, 9vw, 7rem)`, lg `clamp(6rem, 12vw, 10rem)`.
- `bg` maps to the semantic token of same name.

### `Stack`

- Props: `direction?: "row" | "col"` (default `col`), `gap?: 1|2|3|4|6|8|12|16` (Tailwind spacing scale), `align?: "start"|"center"|"end"|"stretch"`, `justify?: "start"|"center"|"end"|"between"|"around"`, `wrap?: boolean`.
- Maps directly to `flex flex-row|flex-col`, `gap-*`, `items-*`, `justify-*`, `flex-wrap`.

### `Grid`

- Props: `cols?: number | { base?: number; sm?: number; md?: number; lg?: number; xl?: number }`, `gap?: 1|2|3|4|6|8|12`.
- Generates `grid grid-cols-* sm:grid-cols-* …` and `gap-*`.

---

## 6. Motion Specs

Shared easing: `--ease-out-warm: cubic-bezier(0.22, 1, 0.36, 1)`. Slightly slower decay than default — reads warm, not snappy.

| Primitive | Duration | Easing | Stagger | Reduced-motion |
|---|---|---|---|---|
| `FadeIn` | 280ms | `--ease-out-warm` | n/a | Render children unwrapped (no opacity transition, no flicker) |
| `Stagger` | child 280ms | `--ease-out-warm` | 70ms between children | Render children unwrapped |
| `ScrollReveal` | 520ms | `--ease-out-warm` | n/a | Render visible immediately, no transform |

Defaults:

- `ScrollReveal` initial: `opacity: 0; transform: translateY(16px);` → final `opacity: 1; transform: none;`
- `ScrollReveal` viewport margin: `-12%` (mid-screen trigger; not too late, not too early)
- `ScrollReveal` `once: true` by default.
- `FadeIn` initial: `opacity: 0` only (no transform).
- `Stagger` wraps a flex/grid parent; child variants inherit `FadeIn` + 8px Y.

Implementation note: detect `prefers-reduced-motion: reduce` once per component; when true, return `<>{children}</>` with no Framer Motion wrapper. Do not merely set duration to 0 — eliminates the wrapper to avoid hydration jitter.

---

## 7. Grain Overlay Spec

Subtle film-grain layer, fixed-position, covers viewport, sits below dialogs but above page content.

| Property | Value |
|---|---|
| Element | Inline SVG `<filter>` with `<feTurbulence>` → `<feColorMatrix>` (desaturate) applied to a full-bleed `<rect fill="white">` |
| `feTurbulence` `type` | `fractalNoise` |
| `feTurbulence` `baseFrequency` | `0.9` |
| `feTurbulence` `numOctaves` | `2` |
| `feTurbulence` `stitchTiles` | `stitch` |
| Opacity | `0.06` |
| Blend mode | `mix-blend-mode: overlay` |
| Color | Filter output desaturated; rect fill `#FFFFFF` so overlay = light grain warming the dark base |
| Sizing | `position: fixed; inset: 0; pointer-events: none; width: 100vw; height: 100vh` |
| z-index | `z-50` per architect — page content sits beneath; Dialog/Sheet portals render above (`z-[60]+`) |
| Reduced motion | No animation regardless; static SVG. No change needed for `prefers-reduced-motion`. |
| Performance | Render once at the root layout; do not re-render per route. `will-change: auto`, no transitions. |

---

## 8. Iconography

- Library: **Lucide React**.
- Default stroke width: `1.75`.
- Default sizes: inline body `20px`, nav/action `24px`, badge/inline-sm `16px`.
- Color: `currentColor` always — never hardcode. Lets icons inherit hover/active text color shifts (e.g. ghost button → copper on hover for dropdown close).
- Decorative icons: `aria-hidden="true"`. Standalone icon-only buttons: require `aria-label`.

---

## Radii + shadow tokens (referenced above)

| Token | Value |
|---|---|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `16px` |
| `--radius-full` | `9999px` |
| `--shadow-popover` | `0 12px 32px -12px oklch(0 0 0 / 0.5)` |
| `--shadow-dialog` | `0 24px 60px -20px oklch(0 0 0 / 0.6)` |
