import 'server-only'

/**
 * lib/content-icons-resolve.ts — Server-only resolver for content-block icon
 * keys, extending `lib/content-icons.ts`'s curated CONTENT_ICONS registry to
 * cover the full lucide-react icon set (~1,962 icons, current names plus
 * deprecated/renamed aliases — see `resolveContentIcon`'s doc comment).
 *
 * This imports the entire lucide-react namespace, which is a meaningfully
 * larger bundle than importing a handful of named icons — that's fine for a
 * Server Component (it never ships to the client), but it must never be
 * imported from client code. Client code (e.g. the admin icon picker) should
 * use the curated `CONTENT_ICONS` map from `./content-icons`, or lucide's own
 * `dynamic` icon import, instead.
 */
import * as lucide from 'lucide-react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { CONTENT_ICONS, type ContentIconKey } from './content-icons'
import type { LucideIcon } from 'lucide-react'

/**
 * Converts a kebab-case icon key (e.g. "a-arrow-down") to the PascalCase
 * component name lucide-react exports it under (e.g. "AArrowDown").
 */
function kebabToPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

/**
 * Resolve a content-block icon key to its lucide-react component.
 *
 * Checks the curated `CONTENT_ICONS` registry first (fast path, matches the
 * client-safe picker), then falls back to looking the key up across all of
 * lucide-react's current icon exports via `lucide.icons` — a namespace map
 * lucide-react maintains of exactly its current PascalCase icon names to
 * components, which excludes non-icon exports (`createLucideIcon`, `Icon`,
 * `icons` itself, etc.) by construction.
 *
 * `lucide.icons` only covers *current* icon names, though — it omits ~245
 * deprecated/renamed aliases (e.g. "alarm-check", now `AlarmClockCheck`,
 * still exported under the old name `AlarmCheck`) that the admin picker
 * nonetheless lists and previews, since it's built from
 * `dynamicIconImports` — lucide-react's full ~1,962-key kebab-case name set.
 * So on a `lucide.icons` miss, we check membership in `dynamicIconImports`
 * and, if present, index the full `lucide` namespace directly. Using
 * `dynamicIconImports` membership as the guard (rather than an ad hoc
 * typeof check on the namespace) means this only ever resolves exactly the
 * set of names the picker offers, never arbitrary namespace exports like
 * `createLucideIcon` or `useLucideContext`.
 *
 * `dynamicIconImports`'s values are lazy dynamic-import thunks (for
 * lucide's own code-split `Icon`/`DynamicIcon` components) — we only ever
 * use it as a key set here, never invoke a thunk, so it stays cheap.
 *
 * Keys matching neither fall back to the caller-supplied default (or
 * "star") — e.g. stale data referencing an icon since removed entirely.
 */
export function resolveContentIcon(
  key: string,
  fallback: ContentIconKey = 'star'
): LucideIcon {
  if (key in CONTENT_ICONS) {
    return CONTENT_ICONS[key as ContentIconKey]
  }

  const pascalName = kebabToPascalCase(key)

  const current = lucide.icons[pascalName as keyof typeof lucide.icons]
  if (typeof current !== 'undefined') {
    return current
  }

  if (key in dynamicIconImports) {
    const aliased = lucide[pascalName as keyof typeof lucide] as
      | LucideIcon
      | undefined
    if (typeof aliased !== 'undefined') {
      return aliased
    }
  }

  return CONTENT_ICONS[fallback]
}
