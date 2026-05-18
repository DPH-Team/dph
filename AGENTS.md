<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:brand-palette-rules -->
# Brand palette usage

The taproom is in Wisconsin and the exterior sign is Green Bay Packers green + gold. The product palette has three anchor families. Use the right one for the right job — mixing them is what makes the brand feel cheap.

## The three families

1. **Copper** (`bg-primary`, `--color-copper`) — the **taproom signature**. Warm, inviting, craft. This is the workhorse.
2. **Cream / Base** (`--color-cream`, `--color-brand-base`) — foreground text + dark surfaces. Dark-only app.
3. **Packers Green + Gold** (`--color-packers-green`, `--color-packers-green-bright`, `--color-packers-gold`) — **place identity**. Drawn from the sign. Rare, intentional, never decorative.

## Where each belongs

**Copper does ACTION:**
- All CTAs (`bg-primary`)
- Links, hover/active states, focus rings (`--color-ring`)
- Form submit buttons, primary nav highlights
- Anything the user is meant to click

**Packers Gold does IDENTITY (loud, sparingly):**
- Logo / wordmark on dark surfaces
- Game-day badges ("Packers Tonight", "Kickoff 7:20")
- Featured / Tap Takeover pills
- Award + recognition callouts
- Star rating fills
- Hero eyebrow underlines / tiny divider rules

**Packers Green does PLACE (calmer, more usable):**
- Footer brand strip
- "Open Now" status pill (green = open)
- Game-night event card backgrounds
- Community / locals section dividers
- Merch promo cards (sign-styled)
- 404 / empty-state illustration grounds
- Transactional email header bars

**Packers Green Bright** — accent **inside** green surfaces only. Non-text UI only (contrast vs green is ~3:1, fails AA for body text):
- Hover state on green pills / cards
- Active tab underline / active border on green surfaces
- Decorative dividers and chips inside green sections

For **links / body text** inside a green surface, use **gold** or **cream** — bright-green is not readable as text.

## Hard rules — do NOT

- **Do NOT use gold for CTAs.** Copper owns action. Gold competing dilutes both.
- **Do NOT use green as page background.** It reads sports bar, not craft taproom.
- **Do NOT use gold or green for body text.** Cream + copper is the reading system.
- **Do NOT use green/gold for generic borders, inputs, or chrome.** Neutral + copper is the system.
- **Do NOT swap `--primary`.** It stays copper.

## The mental test

> Is this about **action**? → Copper.
> Is this about **place, pride, or game day**? → Green / Gold.
> Otherwise → neutral.

If a component doesn't pass that test, it doesn't get green/gold.
<!-- END:brand-palette-rules -->
