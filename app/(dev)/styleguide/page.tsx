import type { Metadata } from "next"
import {
  Beer,
  Coffee,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Menu,
  X,
  ChevronDown,
  Search,
  User,
  LogOut,
} from "lucide-react"

import { Container, Section, Stack, Grid } from "@/components/marketing/layout"
import { FadeIn, Stagger, StaggerItem, ScrollReveal } from "@/components/motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { DialogDemo } from "./islands/DialogDemo"
import { SheetDemo } from "./islands/SheetDemo"
import { DropdownDemo } from "./islands/DropdownDemo"
import { ToastDemo } from "./islands/ToastDemo"
import { TabsDemo } from "./islands/TabsDemo"

export const metadata: Metadata = {
  title: "Styleguide — District Pour Haus",
  description: "Design system reference page.",
  robots: { index: false, follow: false },
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-[clamp(2.25rem,1.9rem+1.8vw,3rem)] leading-[1.1] tracking-[-0.02em] font-medium mb-6">
    {children}
  </h2>
)

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground text-sm uppercase tracking-wider mb-3">
    {children}
  </p>
)

const Divider = () => <div className="border-t border-border my-8" />

export default function StyleguidePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <Container>
          <div className="py-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              District Pour Haus
            </p>
            <h1 className="font-display text-[clamp(3.75rem,2.8rem+4.8vw,6.5rem)] leading-[1.0] tracking-[-0.03em] font-normal text-primary">
              Styleguide
            </h1>
            <p className="mt-3 text-muted-foreground text-sm">
              Design system reference — every primitive in every state.
            </p>
          </div>
        </Container>
      </div>

      {/* ── § Brand ─────────────────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Brand</SectionHeading>

          {/* Hero card */}
          <Card variant="elevated" className="mb-10 p-10">
            <p className="font-display text-[clamp(3rem,2.4rem+3vw,4.5rem)] leading-[1.05] tracking-[-0.025em] font-normal text-primary">
              Our Haus is Your Haus
            </p>
            <p className="mt-3 text-muted-foreground text-base">
              Tagline — displayed in Fraunces, copper accent
            </p>
          </Card>

          <SubLabel>Brand palette</SubLabel>
          <Grid cols={{ base: 2, sm: 3, lg: 6 }} gap={4}>
            {[
              {
                name: "base",
                label: "Base",
                bg: "bg-[oklch(0.158_0.002_286)]",
                value: "oklch(0.158 0.002 286)",
              },
              {
                name: "copper",
                label: "Copper",
                bg: "bg-primary",
                value: "oklch(0.648 0.130 47)",
              },
              {
                name: "copper-hover",
                label: "Copper Hover",
                bg: "bg-[oklch(0.610_0.128_46)]",
                value: "oklch(0.610 0.128 46)",
              },
              {
                name: "copper-active",
                label: "Copper Active",
                bg: "bg-[oklch(0.572_0.124_45)]",
                value: "oklch(0.572 0.124 45)",
              },
              {
                name: "cream",
                label: "Cream",
                bg: "bg-foreground",
                value: "oklch(0.949 0.014 79)",
              },
              {
                name: "destructive",
                label: "Destructive",
                bg: "bg-destructive",
                value: "oklch(0.560 0.150 32)",
              },
              {
                name: "packers-green",
                label: "Packers Green",
                bg: "bg-packers-green",
                value: "oklch(0.302 0.024 160) — #203731",
              },
              {
                name: "packers-green-bright",
                label: "Packers Green Bright",
                bg: "bg-packers-green-bright",
                value: "oklch(0.404 0.048 152) — #2E5339",
              },
              {
                name: "packers-gold",
                label: "Packers Gold",
                bg: "bg-packers-gold",
                value: "oklch(0.806 0.165 81) — #FFB612",
              },
            ].map((swatch) => (
              <div key={swatch.name} className="flex flex-col gap-2">
                <div
                  className={`h-16 rounded-[var(--radius-md)] border border-border ${swatch.bg}`}
                />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {swatch.label}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {swatch.value}
                  </p>
                </div>
              </div>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* ── § Place identity (green & gold) ─────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Place identity</SectionHeading>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Packers green + gold drawn from the exterior sign. Use for{" "}
            <strong className="text-foreground">place, pride, and game day</strong>{" "}
            — never for CTAs. Copper still owns action.
          </p>

          <SubLabel>Gold — identity (loud, sparingly)</SubLabel>
          <Grid cols={{ base: 1, md: 3 }} gap={4} className="mb-10">
            <div className="rounded-[var(--radius-md)] border border-border p-6 bg-background flex flex-col items-start gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-packers-gold text-packers-green px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5" />
                Packers Tonight
              </span>
              <p className="text-xs text-muted-foreground">Game-day badge</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-6 bg-background flex flex-col items-start gap-3">
              <div>
                <p className="font-display text-xs uppercase tracking-[0.25em] text-packers-gold">
                  Voted Local Favorite
                </p>
                <div className="mt-1 h-[2px] w-8 bg-packers-gold" />
              </div>
              <p className="text-xs text-muted-foreground">Hero eyebrow + rule</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border p-6 bg-background flex flex-col items-start gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-packers-gold text-packers-gold px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Beer className="h-3.5 w-3.5" />
                Tap Takeover
              </span>
              <p className="text-xs text-muted-foreground">Featured pill (outline)</p>
            </div>
          </Grid>

          <SubLabel>Green — place (calmer, more usable)</SubLabel>
          <Grid cols={{ base: 1, md: 3 }} gap={4} className="mb-10">
            <div className="rounded-[var(--radius-md)] border border-border p-6 bg-background flex flex-col items-start gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-packers-green text-cream px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-packers-gold" />
                Open Now
              </span>
              <p className="text-xs text-muted-foreground">Status pill</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-packers-green text-cream p-6 flex flex-col gap-2">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-packers-gold">
                Sunday Game Day
              </p>
              <p className="font-display text-2xl">Packers vs. Bears</p>
              <p className="text-xs text-cream/80">Kickoff 12:00 • $4 Spotted Cow</p>
            </div>
            <div className="rounded-[var(--radius-md)] overflow-hidden border border-border">
              <div className="bg-background p-6 pb-3 flex flex-col items-start gap-1">
                <p className="font-display text-sm text-foreground">District Pour Haus</p>
                <p className="text-xs text-muted-foreground">Footer brand strip</p>
              </div>
              <div className="h-2 bg-packers-green" />
              <div className="h-2 bg-packers-gold" />
            </div>
          </Grid>

          <SubLabel>Green Bright — non-text accent on green surfaces</SubLabel>
          <div className="rounded-[var(--radius-md)] bg-packers-green text-cream p-6 flex flex-col gap-4">
            <p className="font-display text-lg">Game-day schedule</p>
            <div className="flex gap-6 border-b border-cream/20">
              <div className="pb-2 border-b-2 border-packers-green-bright -mb-[1px]">
                <p className="text-sm font-medium">This week</p>
              </div>
              <div className="pb-2">
                <p className="text-sm text-cream/70">Next week</p>
              </div>
              <div className="pb-2">
                <p className="text-sm text-cream/70">Playoffs</p>
              </div>
            </div>
            <a
              href="#"
              className="text-sm font-medium text-packers-gold underline decoration-packers-gold/50 underline-offset-4 hover:decoration-packers-gold self-start"
            >
              View full schedule →
            </a>
            <p className="text-xs text-cream/60">
              Active tab underline uses bright green (decorative, ~3:1 contrast).
              Body link uses gold for readability. Bright green is for non-text UI
              only on green surfaces.
            </p>
          </div>

          <div className="mt-10">
            <SubLabel>Anti-patterns — do NOT</SubLabel>
          </div>
          <Grid cols={{ base: 1, md: 2 }} gap={4}>
            <div className="rounded-[var(--radius-md)] border border-destructive/40 p-6 bg-background flex flex-col items-start gap-3">
              <button
                type="button"
                disabled
                className="rounded-md bg-packers-gold text-packers-green px-4 py-2 text-sm font-semibold opacity-60 cursor-not-allowed"
              >
                Reserve Table
              </button>
              <p className="text-xs text-destructive font-medium">
                ✗ Gold CTA — competes with copper, dilutes both
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-destructive/40 p-6 bg-packers-green/30 flex flex-col items-start gap-3">
              <p className="text-sm text-foreground">Page body content…</p>
              <p className="text-xs text-destructive font-medium">
                ✗ Green page background — reads sports bar, not craft taproom
              </p>
            </div>
          </Grid>
        </Container>
      </Section>

      {/* ── § Typography ────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Typography</SectionHeading>

          <SubLabel>Display scale (Fraunces)</SubLabel>
          <Stack direction="col" gap={6} className="mb-10">
            {[
              {
                step: "display-xl",
                cls: "font-display text-[clamp(3.75rem,2.8rem+4.8vw,6.5rem)] leading-[1.0] tracking-[-0.03em] font-normal",
              },
              {
                step: "display-lg",
                cls: "font-display text-[clamp(3rem,2.4rem+3vw,4.5rem)] leading-[1.05] tracking-[-0.025em] font-normal",
              },
              {
                step: "display-md",
                cls: "font-display text-[clamp(2.25rem,1.9rem+1.8vw,3rem)] leading-[1.1] tracking-[-0.02em] font-medium",
              },
              {
                step: "display-sm",
                cls: "font-display text-[clamp(1.75rem,1.5rem+1.2vw,2.25rem)] leading-[1.15] tracking-[-0.015em] font-medium",
              },
            ].map(({ step, cls }) => (
              <div key={step}>
                <p className="text-xs text-muted-foreground font-mono mb-1">
                  {step}
                </p>
                <p className={cls}>Pour. Gather. Repeat.</p>
              </div>
            ))}
          </Stack>

          <Divider />

          <SubLabel>Body scale (Inter)</SubLabel>
          <Stack direction="col" gap={4} className="mb-10">
            {[
              {
                step: "text-2xl",
                cls: "text-[clamp(1.5rem,1.4rem+0.5vw,1.75rem)] leading-[1.35] tracking-[-0.01em] font-medium",
              },
              {
                step: "text-xl",
                cls: "text-[clamp(1.25rem,1.18rem+0.35vw,1.375rem)] leading-[1.45] tracking-[-0.005em] font-medium",
              },
              {
                step: "text-lg",
                cls: "text-[clamp(1.125rem,1.07rem+0.25vw,1.1875rem)] leading-[1.55] font-normal",
              },
              {
                step: "text-base",
                cls: "text-[clamp(1rem,0.96rem+0.2vw,1.0625rem)] leading-[1.6] font-normal",
              },
              {
                step: "text-sm",
                cls: "text-[clamp(0.875rem,0.84rem+0.18vw,0.9375rem)] leading-[1.5] font-normal",
              },
              {
                step: "text-xs",
                cls: "text-[clamp(0.75rem,0.72rem+0.15vw,0.8125rem)] leading-[1.4] tracking-[0.02em] font-medium",
              },
            ].map(({ step, cls }) => (
              <div key={step}>
                <p className="text-xs text-muted-foreground font-mono mb-1">
                  {step}
                </p>
                <p className={cls}>
                  The self-pour experience at District Pour Haus.{" "}
                  <span className="tabular-nums text-primary">12,847 pours since opening</span>
                </p>
              </div>
            ))}
          </Stack>

          <Divider />

          <SubLabel>Body weights (Inter)</SubLabel>
          <Stack direction="row" gap={6} wrap className="mb-10">
            {[
              { weight: "400", label: "Regular 400" },
              { weight: "500", label: "Medium 500" },
              { weight: "600", label: "Semibold 600" },
              { weight: "700", label: "Bold 700" },
            ].map(({ weight, label }) => (
              <div key={weight}>
                <p className="text-xs text-muted-foreground font-mono mb-1">
                  {weight}
                </p>
                <p
                  className="text-base font-sans"
                  style={{ fontWeight: weight }}
                >
                  {label}
                </p>
              </div>
            ))}
          </Stack>

          <SubLabel>Display weights (Fraunces)</SubLabel>
          <Stack direction="row" gap={6} wrap>
            {[
              { weight: "400", label: "Regular 400" },
              { weight: "500", label: "Medium 500" },
              { weight: "600", label: "Semibold 600" },
              { weight: "700", label: "Bold 700" },
            ].map(({ weight, label }) => (
              <div key={weight}>
                <p className="text-xs text-muted-foreground font-mono mb-1">
                  {weight}
                </p>
                <p
                  className="text-xl font-display"
                  style={{ fontWeight: weight }}
                >
                  {label}
                </p>
              </div>
            ))}
          </Stack>
        </Container>
      </Section>

      {/* ── § Colors (semantic) ─────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Colors (semantic)</SectionHeading>
          <Grid cols={{ base: 2, sm: 3, md: 4, lg: 7 }} gap={4}>
            {[
              { name: "background", cls: "bg-background" },
              { name: "foreground", cls: "bg-foreground" },
              { name: "card", cls: "bg-card" },
              { name: "popover", cls: "bg-popover" },
              { name: "primary", cls: "bg-primary" },
              { name: "primary-foreground", cls: "bg-primary-foreground" },
              { name: "secondary", cls: "bg-secondary" },
              { name: "muted", cls: "bg-muted" },
              { name: "muted-foreground", cls: "bg-muted-foreground" },
              { name: "accent", cls: "bg-accent" },
              { name: "destructive", cls: "bg-destructive" },
              { name: "border", cls: "bg-border" },
              { name: "input", cls: "bg-input" },
              { name: "ring", cls: "bg-ring" },
            ].map(({ name, cls }) => (
              <div key={name} className="flex flex-col gap-2">
                <div
                  className={`h-12 rounded-[var(--radius-md)] border border-border ${cls}`}
                />
                <p className="text-xs font-mono text-muted-foreground break-all">
                  --{name}
                </p>
              </div>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* ── § Buttons ───────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Buttons</SectionHeading>

          <SubLabel>Variants</SubLabel>
          <Stack direction="col" gap={6} className="mb-10">
            {(
              [
                "default",
                "secondary",
                "outline",
                "ghost",
                "destructive",
                "link",
              ] as const
            ).map((variant) => (
              <div key={variant}>
                <p className="text-xs text-muted-foreground font-mono mb-3">
                  {variant}
                </p>
                <Stack direction="row" gap={3} wrap align="center">
                  <Button variant={variant}>Default</Button>
                  <Button variant={variant} disabled>
                    Disabled
                  </Button>
                  <Button variant={variant}>
                    <Beer aria-hidden="true" />
                    With icon
                  </Button>
                  <Button variant={variant} size="icon" aria-label="Beer">
                    <Beer aria-hidden="true" />
                  </Button>
                </Stack>
              </div>
            ))}
          </Stack>

          <Divider />

          <SubLabel>Sizes</SubLabel>
          <Stack direction="row" gap={3} wrap align="center">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Beer">
              <Beer aria-hidden="true" />
            </Button>
          </Stack>
        </Container>
      </Section>

      {/* ── § Form fields ───────────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Form fields</SectionHeading>

          <SubLabel>Input</SubLabel>
          <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={6} className="mb-10">
            <div className="flex flex-col gap-2">
              <Label htmlFor="input-default">Default</Label>
              <Input id="input-default" placeholder="Enter your name…" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="input-disabled">Disabled</Label>
              <Input
                id="input-disabled"
                placeholder="Cannot edit this"
                disabled
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="input-error">Error state</Label>
              <Input
                id="input-error"
                placeholder="bad@domain"
                aria-invalid="true"
                defaultValue="bad@domain"
              />
              <p className="text-xs text-destructive">
                Enter a valid email address.
              </p>
            </div>
          </Grid>

          <Divider />

          <SubLabel>Textarea</SubLabel>
          <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={6} className="mb-10">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ta-default">Default</Label>
              <Textarea
                id="ta-default"
                placeholder="Tell us about your event…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ta-disabled">Disabled</Label>
              <Textarea
                id="ta-disabled"
                placeholder="Cannot edit this"
                disabled
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ta-error">Error state</Label>
              <Textarea
                id="ta-error"
                aria-invalid="true"
                defaultValue="This field has an error."
              />
              <p className="text-xs text-destructive">
                Message must be at least 20 characters.
              </p>
            </div>
          </Grid>

          <Divider />

          <SubLabel>Select</SubLabel>
          <Stack direction="row" gap={6} wrap align="start">
            <div className="flex flex-col gap-2">
              <Label htmlFor="select-default">Drink type</Label>
              <Select defaultValue="draft">
                <SelectTrigger id="select-default" className="w-48">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="can">Can</SelectItem>
                    <SelectItem value="cocktail">Cocktail</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="select-disabled">Disabled</Label>
              <Select disabled>
                <SelectTrigger id="select-disabled" className="w-48">
                  <SelectValue placeholder="Unavailable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="x">Option</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </Stack>
        </Container>
      </Section>

      {/* ── § Cards ─────────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Cards</SectionHeading>
          <Grid cols={{ base: 1, md: 3 }} gap={6}>
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default card</CardTitle>
                <CardDescription>
                  Standard surface — card bg lifted off base, 1px border.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Use for content groupings that need subtle separation from the
                  page background.
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated card</CardTitle>
                <CardDescription>
                  Copper top-edge gradient — warm taproom edge highlight.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Featured content, hero tiles, and primary information blocks.
                </p>
              </CardContent>
            </Card>

            <a href="#cards" tabIndex={0} className="block">
              <Card variant="interactive" className="h-full">
                <CardHeader>
                  <CardTitle>Interactive card</CardTitle>
                  <CardDescription>
                    Hover to see border brighten and card lift by 2px.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tap list entries, event listings, and clickable product
                    tiles.
                  </p>
                </CardContent>
              </Card>
            </a>
          </Grid>
        </Container>
      </Section>

      {/* ── § Badges ────────────────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Badges</SectionHeading>
          <Stack direction="row" gap={3} wrap align="center">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </Stack>
        </Container>
      </Section>

      {/* ── § Tabs ──────────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Tabs</SectionHeading>
          <p className="text-sm text-muted-foreground mb-6">
            Copper underline indicator, no pill background, animated scale-x
            transition.
          </p>
          <TabsDemo />
        </Container>
      </Section>

      {/* ── § Dialog ────────────────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Dialog</SectionHeading>
          <p className="text-sm text-muted-foreground mb-6">
            Backdrop blur 4px, fade 200ms, z-[61] — above grain overlay
            (z-50).
          </p>
          <DialogDemo />
        </Container>
      </Section>

      {/* ── § Sheet ─────────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Sheet</SectionHeading>
          <p className="text-sm text-muted-foreground mb-6">
            Right-side slide-in, 280ms ease-out-warm, z-[61] — above grain
            overlay.
          </p>
          <SheetDemo />
        </Container>
      </Section>

      {/* ── § Dropdown menu ─────────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Dropdown menu</SectionHeading>
          <p className="text-sm text-muted-foreground mb-6">
            Popover surface, 4px radius items, destructive variant on sign out.
          </p>
          <DropdownDemo />
        </Container>
      </Section>

      {/* ── § Toast ─────────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Toast (sonner)</SectionHeading>
          <p className="text-sm text-muted-foreground mb-6">
            Renders via <code className="font-mono text-xs">&lt;Toaster /&gt;</code>{" "}
            mounted in the dev layout. Bottom-right position.
          </p>
          <ToastDemo />
        </Container>
      </Section>

      {/* ── § Layout primitives ─────────────────────────────────────── */}
      <Section padding="md">
        <Container>
          <SectionHeading>Layout primitives</SectionHeading>

          <SubLabel>Container widths</SubLabel>
          <Stack direction="col" gap={4} className="mb-10">
            {(["sm", "md", "xl"] as const).map((size) => (
              <Container key={size} size={size}>
                <div className="border border-dashed border-border rounded-[var(--radius-md)] px-4 py-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    Container size=&quot;{size}&quot;
                  </span>
                </div>
              </Container>
            ))}
          </Stack>

          <Divider />

          <SubLabel>Section padding</SubLabel>
          <Stack direction="col" gap={4} className="mb-10">
            {(["sm", "md", "lg"] as const).map((pad) => (
              <Section
                key={pad}
                padding={pad}
                className="border border-dashed border-border rounded-[var(--radius-md)]"
              >
                <p className="text-xs font-mono text-muted-foreground">
                  Section padding=&quot;{pad}&quot;
                </p>
              </Section>
            ))}
          </Stack>

          <Divider />

          <SubLabel>Stack</SubLabel>
          <Stack direction="col" gap={6} className="mb-10">
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-3">
                direction=&quot;row&quot; gap=4
              </p>
              <Stack direction="row" gap={4}>
                {["A", "B", "C", "D"].map((l) => (
                  <div
                    key={l}
                    className="h-10 w-10 rounded-[var(--radius-md)] bg-muted border border-border flex items-center justify-center text-sm font-medium"
                  >
                    {l}
                  </div>
                ))}
              </Stack>
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-3">
                direction=&quot;col&quot; gap=2
              </p>
              <Stack direction="col" gap={2} className="w-fit">
                {["A", "B", "C"].map((l) => (
                  <div
                    key={l}
                    className="h-10 w-32 rounded-[var(--radius-md)] bg-muted border border-border flex items-center justify-center text-sm font-medium"
                  >
                    {l}
                  </div>
                ))}
              </Stack>
            </div>
          </Stack>

          <Divider />

          <SubLabel>Grid columns</SubLabel>
          <Stack direction="col" gap={6}>
            {([1, 2, 3] as const).map((cols) => (
              <div key={cols}>
                <p className="text-xs font-mono text-muted-foreground mb-3">
                  cols={cols}
                </p>
                <Grid cols={cols} gap={4}>
                  {Array.from({ length: cols }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-[var(--radius-md)] bg-muted border border-border flex items-center justify-center text-sm font-medium text-muted-foreground"
                    >
                      {i + 1}
                    </div>
                  ))}
                </Grid>
              </div>
            ))}
          </Stack>
        </Container>
      </Section>

      {/* ── § Motion ────────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Motion</SectionHeading>
          <p className="text-sm text-muted-foreground mb-8">
            Disable reduced-motion in your OS to see animations. All motion
            primitives render children unwrapped when reduced-motion is active —
            no flicker.
          </p>

          <SubLabel>FadeIn</SubLabel>
          <div className="mb-10">
            <FadeIn>
              <Card variant="elevated" className="max-w-sm">
                <CardHeader>
                  <CardTitle>Faded in</CardTitle>
                  <CardDescription>
                    Opacity 0 → 1 over 280ms, ease-out-warm.
                  </CardDescription>
                </CardHeader>
              </Card>
            </FadeIn>
          </div>

          <Divider />

          <SubLabel>Stagger</SubLabel>
          <div className="mb-10">
            <Stagger className="flex flex-col gap-3">
              {["First item", "Second item", "Third item", "Fourth item"].map(
                (item) => (
                  <StaggerItem key={item}>
                    <div className="rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-sm">
                      {item} — fades in with 70ms stagger
                    </div>
                  </StaggerItem>
                )
              )}
            </Stagger>
          </div>

          <Divider />

          <SubLabel>ScrollReveal</SubLabel>
          <p className="text-sm text-muted-foreground mb-6">
            Scroll down to see the card below animate in from y+16px.
          </p>
        </Container>
      </Section>

      {/* ScrollReveal needs to be below the fold */}
      <Section padding="lg">
        <Container>
          <ScrollReveal>
            <Card variant="elevated" className="max-w-sm">
              <CardHeader>
                <CardTitle>ScrollReveal</CardTitle>
                <CardDescription>
                  Opacity 0 → 1, translateY 16px → 0, 520ms, triggered once at
                  −12% viewport margin.
                </CardDescription>
              </CardHeader>
            </Card>
          </ScrollReveal>
        </Container>
      </Section>

      {/* ── § Icons ─────────────────────────────────────────────────── */}
      <Section padding="md" bg="card">
        <Container>
          <SectionHeading>Icons</SectionHeading>
          <p className="text-sm text-muted-foreground mb-6">
            Lucide React — stroke-width 1.75, currentColor.
          </p>

          <SubLabel>20px (inline body)</SubLabel>
          <Stack direction="row" gap={4} wrap className="mb-8" align="center">
            {[
              Beer,
              Coffee,
              Calendar,
              MapPin,
              Phone,
              Mail,
              Menu,
              X,
              ChevronDown,
              Search,
              User,
              LogOut,
            ].map((Icon, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] border border-border bg-background"
              >
                <Icon
                  aria-hidden="true"
                  size={20}
                  strokeWidth={1.75}
                  className="text-foreground"
                />
              </div>
            ))}
          </Stack>

          <SubLabel>24px (nav/action)</SubLabel>
          <Stack direction="row" gap={4} wrap align="center">
            {[
              Beer,
              Coffee,
              Calendar,
              MapPin,
              Phone,
              Mail,
              Menu,
              X,
              ChevronDown,
              Search,
              User,
              LogOut,
            ].map((Icon, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] border border-border bg-background"
              >
                <Icon
                  aria-hidden="true"
                  size={24}
                  strokeWidth={1.75}
                  className="text-foreground"
                />
              </div>
            ))}
          </Stack>
        </Container>
      </Section>

      {/* Footer */}
      <div className="border-t border-border py-6">
        <Container>
          <p className="text-xs text-muted-foreground">
            District Pour Haus — Design System v1 · Phase 1
          </p>
        </Container>
      </div>
    </main>
  )
}
