'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { DynamicIcon, iconNames } from 'lucide-react/dynamic';
import type { IconName } from 'lucide-react/dynamic';
import { CircleHelp, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTENT_ICONS, CONTENT_ICON_OPTIONS } from '@/lib/content-icons';

// ─── Full icon name list ──────────────────────────────────────────────────────
// lucide-react/dynamic ships every icon (~1,962) as a lazily-loaded chunk keyed
// by kebab name. `iconNames` is precomputed by the package as
// Object.keys(dynamicIconImports) — we just sort it once for a stable,
// alphabetically-browsable list, and mirror it into a Set for O(1)
// "is this a real icon name" checks.
const ALL_ICON_NAMES: IconName[] = [...iconNames].sort();
const ALL_ICON_NAME_SET = new Set<string>(iconNames);

const MAX_RESULTS = 96;

// ─── Loading / failure fallback for DynamicIcon ───────────────────────────────
// DynamicIcon lazy-imports each icon's chunk in a useEffect, so there's a brief
// window before it resolves — and if `name` isn't a real icon, the import
// promise rejects and never resolves. In both cases DynamicIcon renders
// `fallback` (or null) instead of crashing. Defined at module scope so the
// reference is stable across renders (an inline arrow function here would
// recreate a "new" fallback component every render).
function IconLoadingFallback() {
  return (
    <span
      className="block size-4.5 rounded-sm bg-muted-foreground/15"
      aria-hidden="true"
    />
  );
}

// ─── Search matching ──────────────────────────────────────────────────────────
// Plain substring match on the kebab name, plus two normalized variants so
// "map pin" or "mappin" both find "map-pin".

interface NormalizedQuery {
  plain: string;
  dashed: string;
  stripped: string;
}

function normalizeQuery(raw: string): NormalizedQuery {
  const plain = raw.trim().toLowerCase();
  return {
    plain,
    dashed: plain.replace(/\s+/g, '-'),
    stripped: plain.replace(/[\s-]+/g, ''),
  };
}

function matchesQuery(name: string, query: NormalizedQuery): boolean {
  if (!query.plain) return true;
  if (name.includes(query.plain) || name.includes(query.dashed)) return true;
  return name.replace(/-/g, '').includes(query.stripped);
}

// ─── Shared button styling (matches the segmented-control convention used
// elsewhere in the admin, e.g. StatusPanel's status buttons) ──────────────────

function pickerButtonClass(isSelected: boolean, extra?: string): string {
  return cn(
    'flex items-center justify-center rounded-md border transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
    isSelected
      ? 'border-primary bg-primary/10 text-primary'
      : 'border-border bg-[oklch(0.175_0.002_286)] text-muted-foreground hover:border-[oklch(0.400_0.006_80)] hover:text-foreground',
    extra,
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IconPickerFieldProps {
  /** Dot-path into the react-hook-form state, e.g. `whyUs.${idx}.icon`. */
  name: string;
  /** Accessible name for the quick-pick button group. Defaults to "Icon". */
  label?: string;
}

/**
 * IconPickerField — visual picker for content-block icon keys.
 *
 * Two tiers:
 *  1. A curated quick-pick row (CONTENT_ICON_OPTIONS) — the common choices,
 *     one click away, rendered with the statically-bundled CONTENT_ICONS
 *     components (no lazy loading).
 *  2. A "Browse all icons…" panel covering the full lucide set (~1,962 via
 *     lucide-react/dynamic), with a search box and a capped results grid.
 *
 * The underlying form value stays a plain kebab-case string — content-block
 * schemas intentionally keep icon as a loose string, not an enum, so unknown
 * or legacy values remain possible and are never silently rewritten. Wired
 * via watch/setValue rather than register, since there's no native input
 * backing it — matches the SwitchField / AllergenCheckboxGroup convention
 * used elsewhere in the admin for non-native-input controls.
 */
export function IconPickerField({ name, label = 'Icon' }: IconPickerFieldProps) {
  const { watch, setValue } = useFormContext();
  const value: string = watch(name) ?? '';
  const isCurated = value !== '' && value in CONTENT_ICONS;
  const isKnownIcon = value !== '' && ALL_ICON_NAME_SET.has(value);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Auto-focus the search box whenever the panel opens. This is a pure DOM
  // side effect (no setState), so it stays in an effect; resetting the query
  // itself is handled directly by the event handlers below that close the
  // panel, not here, to avoid setting state synchronously inside an effect.
  useEffect(() => {
    if (browseOpen) {
      searchInputRef.current?.focus();
    }
  }, [browseOpen]);

  function select(next: string) {
    setValue(name, next, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
  }

  // Toggling closed also clears the query, so re-opening starts from the
  // full browsable list.
  function toggleBrowse() {
    if (browseOpen) {
      setBrowseOpen(false);
      setQuery('');
    } else {
      setBrowseOpen(true);
    }
  }

  function closeBrowse() {
    setBrowseOpen(false);
    setQuery('');
    toggleButtonRef.current?.focus();
  }

  function selectFromBrowse(next: string) {
    select(next);
    closeBrowse();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeBrowse();
    }
  }

  // Empty search shows the first MAX_RESULTS names alphabetically, so the
  // panel is browsable (not just searchable) as soon as it opens; typing
  // narrows it down. Capped client-side rendering keeps ~1,962 possible
  // DynamicIcon mounts from happening at once.
  const normalizedQuery = useMemo(() => normalizeQuery(query), [query]);
  const filtered = useMemo(
    () =>
      query.trim()
        ? ALL_ICON_NAMES.filter((n) => matchesQuery(n, normalizedQuery))
        : ALL_ICON_NAMES,
    [query, normalizedQuery],
  );
  const total = filtered.length;
  const results = filtered.slice(0, MAX_RESULTS);

  return (
    <div className="space-y-2">
      {/* Quick picks */}
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {CONTENT_ICON_OPTIONS.map((opt) => {
          const Icon = CONTENT_ICONS[opt.value];
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              aria-label={opt.label}
              title={opt.label}
              onClick={() => select(opt.value)}
              className={pickerButtonClass(isSelected, 'size-8')}
            >
              <Icon className="size-4.5" aria-hidden="true" />
            </button>
          );
        })}

        {/* Browse-all toggle */}
        <button
          ref={toggleButtonRef}
          type="button"
          aria-expanded={browseOpen}
          aria-controls={panelId}
          onClick={toggleBrowse}
          className={pickerButtonClass(
            browseOpen,
            'h-8 gap-1.5 px-2.5 text-xs font-medium',
          )}
        >
          <Search className="size-3.5" aria-hidden="true" />
          Browse all icons…
        </button>
      </div>

      {/* Current-value preview — only shown when the value isn't one of the
          quick picks above (which already show their own pressed state). */}
      {value && !isCurated && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isKnownIcon ? (
            <DynamicIcon
              name={value as IconName}
              className="size-3.5 shrink-0"
              aria-hidden="true"
              fallback={IconLoadingFallback}
            />
          ) : (
            <CircleHelp className="size-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>
            Selected:{' '}
            <code
              className="rounded bg-[oklch(0.175_0.002_286)] px-1 py-0.5 font-mono text-[11px]"
              title={value}
            >
              {value}
            </code>
            {!isKnownIcon && ' — unrecognized icon key, pick one to replace it'}
          </span>
        </p>
      )}

      {/* Browse-all panel */}
      {browseOpen && (
        <div
          id={panelId}
          className="space-y-2.5 rounded-lg border border-border bg-[oklch(0.150_0.002_286)] p-3"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search all icons…"
              aria-label="Search all icons"
              className="h-8 w-full rounded-md border border-border bg-[oklch(0.120_0.002_286)] pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="All icon results"
            className="grid max-h-64 grid-cols-6 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-8 md:grid-cols-10"
          >
            {results.map((iconName) => {
              const isSelected = value === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={iconName}
                  title={iconName}
                  onClick={() => selectFromBrowse(iconName)}
                  className={pickerButtonClass(isSelected, 'size-8')}
                >
                  <DynamicIcon
                    name={iconName}
                    className="size-4.5"
                    aria-hidden="true"
                    fallback={IconLoadingFallback}
                  />
                </button>
              );
            })}
          </div>

          {total === 0 ? (
            <p className="text-xs text-muted-foreground">
              No icons match &ldquo;{query}&rdquo;.
            </p>
          ) : total > MAX_RESULTS ? (
            <p className="text-xs text-muted-foreground">
              Showing {MAX_RESULTS} of {total} — keep typing to narrow.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
