---
name: dph-component
description: Create a new reusable UI component in the District Pour Haus design system. Use when a piece of UI will appear in two or more places, when a spec from dph-design defines a new visual primitive, or when extending shadcn primitives with brand-specific behavior. Ensures tokens, states, motion, and accessibility are wired correctly.
---

# dph-component

Builds a new component that follows project conventions.

## When to invoke

- A new shared visual element is needed (e.g. `TapCard`, `EventPoster`, `HoursPanel`)
- An existing shadcn primitive needs brand-specific styling consolidated into a wrapper

## Steps

1. **Confirm placement.** Pick the directory:
   - `components/ui/` — primitives (Button-level)
   - `components/marketing/` — public-site composed pieces
   - `components/admin/` — admin composed pieces
   - `components/motion/` — Framer Motion wrappers
2. **Define props with TypeScript.** Use `interface` for component props, exported. Use `cn()` from `lib/utils.ts` for class merging.
3. **Use tokens, never raw colors.** Reference Tailwind tokens like `bg-background`, `text-foreground`, `border-border`, `text-accent`. If a needed token doesn't exist, add it to `app/globals.css` first.
4. **Implement every state.** Default, hover, focus-visible (with ring), active, disabled, loading (if applicable), error (if applicable).
5. **Respect motion preference.** Wrap any animation in `motion-safe:` Tailwind variant or check `useReducedMotion()` from Framer Motion.
6. **Keyboard + ARIA.** Interactive components need `aria-label` or visible labels, keyboard handlers, and visible focus rings (`focus-visible:ring-2 focus-visible:ring-accent`).
7. **Mobile-first.** Test at 360px width mentally — does it wrap? Does it overflow?
8. **Server-first.** Default to a Server Component. Add `'use client'` only if you use state, effects, or browser APIs.
9. **Render on `/styleguide`.** Add an example to the styleguide route so the design system stays browsable.
10. **No comments unless behavior is non-obvious.** No prop JSDoc for self-documenting names.

## Template

```tsx
import { cn } from '@/lib/utils'

interface FooProps {
  variant?: 'default' | 'subtle'
  className?: string
  children: React.ReactNode
}

export function Foo({ variant = 'default', className, children }: FooProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground',
        variant === 'subtle' && 'bg-muted',
        className,
      )}
    >
      {children}
    </div>
  )
}
```

## Done criteria

- Component renders correctly on `/styleguide`
- Lighthouse accessibility ≥ 95 on styleguide page
- No raw hex / font / spacing values — all tokens
- Works at 360px width
