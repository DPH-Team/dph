import 'server-only';

import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contentBlocks } from '@/lib/db/schema';
import type { ContentBlock } from '@/lib/db/schema';
import {
  CONTENT_BLOCK_KEYS,
  CONTENT_BLOCK_SCHEMAS,
} from '@/lib/validators/content-blocks';
import type {
  ContentBlockKey,
  HomeHeroValue,
  AboutBodyValue,
  HomeCalloutsValue,
} from '@/lib/validators/content-blocks';
import { hero } from '@/lib/fixtures/hero';
import { homeCallouts } from '@/lib/fixtures/home-callouts';
import { aboutContent } from '@/lib/fixtures/about';
import { auditUpdate } from '@/lib/audit';

// ─── Fixture fallbacks keyed by block key ─────────────────────────────────────
// Used when DB row value fails schema parsing. Shape must match the key's type.

const FIXTURE_FALLBACKS: {
  home_hero: HomeHeroValue;
  home_callouts: HomeCalloutsValue;
  about_body: AboutBodyValue;
} = {
  home_hero: hero,
  home_callouts: homeCallouts,
  about_body: {
    headline: aboutContent.headline,
    lead: aboutContent.lead,
    paragraphs: aboutContent.paragraphs,
    rfidSteps: aboutContent.rfidSteps,
    values: aboutContent.values,
  },
};

// ─── Value type map (narrows return type per key) ─────────────────────────────

type ContentBlockValueMap = {
  home_hero: HomeHeroValue;
  home_callouts: HomeCalloutsValue;
  about_body: AboutBodyValue;
};

// ─── Return type: row metadata + narrowed value ───────────────────────────────

export type ContentBlockRow<K extends ContentBlockKey> = {
  key: K;
  value: ContentBlockValueMap[K];
  updatedAt: Date;
  updatedBy: string | null;
};

// ─── Read queries ─────────────────────────────────────────────────────────────

/**
 * Return all content_blocks rows. The caller receives raw DB rows; value is
 * unvalidated jsonb. Use getContentBlock() for a typed + validated single-row
 * read with fallback.
 */
export async function listContentBlocks(): Promise<ContentBlock[]> {
  return db
    .select()
    .from(contentBlocks)
    .orderBy(
      sql`array_position(
        array['home_hero','home_callouts','about_body']::text[],
        ${contentBlocks.key}
      )`,
    );
}

/**
 * Return a single content block, parsing the value through its Zod schema.
 *
 * On parse failure: logs the error, falls back to the matching fixture value,
 * and returns a row-shaped object using the DB row's metadata fields. This
 * ensures the public site always has valid data even if a bad write occurred.
 *
 * The return type is narrowed to the specific key's value type.
 */
export async function getContentBlock<K extends ContentBlockKey>(
  key: K,
): Promise<ContentBlockRow<K>> {
  const rows = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.key, key))
    .limit(1);

  const row = rows[0];

  // If no row exists yet, return fixture data with sensible defaults.
  if (!row) {
    return {
      key,
      value: FIXTURE_FALLBACKS[key] as ContentBlockValueMap[K],
      updatedAt: new Date(),
      updatedBy: null,
    };
  }

  const schema = CONTENT_BLOCK_SCHEMAS[key];
  const parsed = schema.safeParse(row.value);

  if (!parsed.success) {
    console.error(
      `[content-blocks] Parse failure for key "${key}" — falling back to fixture.`,
      parsed.error.flatten(),
    );
    return {
      key,
      value: FIXTURE_FALLBACKS[key] as ContentBlockValueMap[K],
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }

  return {
    key,
    value: parsed.data as ContentBlockValueMap[K],
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

// ─── Write queries ────────────────────────────────────────────────────────────

/**
 * Validate and upsert a content block value, then audit the change.
 *
 * Throws a ZodError if the value does not conform to the key's schema.
 * Returns the full updated row.
 */
export async function updateContentBlock<K extends ContentBlockKey>(
  key: K,
  value: ContentBlockValueMap[K],
  actorId: string,
): Promise<ContentBlock> {
  // Validate before writing — parse() throws ZodError on failure.
  const schema = CONTENT_BLOCK_SCHEMAS[key];
  const validated = schema.parse(value);

  // Read current row for audit diff (best-effort).
  const existing = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.key, key))
    .limit(1);
  const before = existing[0]?.value ?? null;

  const result = await db
    .insert(contentBlocks)
    .values({
      key,
      value: validated,
      updatedBy: actorId,
    })
    .onConflictDoUpdate({
      target: contentBlocks.key,
      set: {
        value: sql`excluded.value`,
        updatedAt: sql`now()`,
        updatedBy: actorId,
      },
    })
    .returning();

  const updated = result[0];

  // Audit — non-fatal.
  await auditUpdate(
    'content_block',
    key,
    { value: before },
    { value: validated },
  );

  return updated;
}

// Re-export key constants so callers can import from one place.
export { CONTENT_BLOCK_KEYS };
