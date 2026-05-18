---
name: dph-page
description: Create a new public-facing page route in the District Pour Haus Next.js app. Use when adding a route under `app/(public)/`. Handles the route file, metadata, layout, loading/error/not-found states, and JSON-LD where applicable. Enforces design tokens, mobile responsiveness, and SEO conventions.
---

# dph-page

Scaffolds a new public page following project conventions.

## When to invoke

- A new top-level route is needed under `app/(public)/`
- A nested route (e.g. `events/[slug]`) is needed

## Steps

1. **Pick the path.** Place under `app/(public)/<route>/page.tsx`. Nested dynamic routes use `[slug]/page.tsx`.
2. **Decide rendering mode.**
   - Static or revalidated content → Server Component with `export const revalidate = N` or tag-based `revalidateTag`
   - User-personalized content → server-side per-request
3. **Write metadata.** Export `generateMetadata` or a static `metadata` object: title, description, openGraph (title, description, image, url), twitter.
4. **Implement the page.** Server Component by default. Fetch data via Drizzle (`lib/db/queries/`) — or use a fixture import in Phase 2.
5. **Add loading + error + not-found states.** Create `loading.tsx`, `error.tsx`, `not-found.tsx` siblings.
6. **JSON-LD where applicable.** Use a `<script type="application/ld+json">` block with proper schema.org types: `Restaurant`, `Event`, `Menu`, `WebPage`.
7. **Use design tokens only.** No raw colors / fonts.
8. **Mobile-first.** Test mentally at 360px.
9. **Add to sitemap.** Update `app/sitemap.ts` so the route is included.

## Template

```tsx
// app/(public)/<route>/page.tsx
import type { Metadata } from 'next'
import { Container } from '@/components/marketing/container'
import { Section } from '@/components/marketing/section'

export const metadata: Metadata = {
  title: '<Title> | District Pour Haus',
  description: '<≤155 char description>',
  openGraph: {
    title: '<Title>',
    description: '<…>',
    images: ['/og/<route>.png'],
  },
}

export const revalidate = 300

export default async function Page() {
  return (
    <Section>
      <Container>
        {/* content */}
      </Container>
    </Section>
  )
}
```

## Done criteria

- Page renders at the new route
- Metadata visible in `<head>` (verify with view-source)
- Loading state shows during slow fetches
- Mobile + desktop render correctly
- Added to `app/sitemap.ts`
