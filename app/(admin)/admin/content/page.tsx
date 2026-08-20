import { requireStaff } from '@/lib/auth';
import {
  listContentBlocks,
  CONTENT_BLOCK_KEYS,
} from '@/lib/db/queries/content-blocks';
import { ContentBlocksTable, type ContentBlockListRow } from './ContentBlocksTable';

export default async function ContentPage() {
  await requireStaff();

  const dbRows = await listContentBlocks();
  const dbRowsByKey = new Map(dbRows.map((row) => [row.key, row]));

  // Render one row per registered key, in CONTENT_BLOCK_KEYS order, merged
  // with whatever DB rows exist. Keys without a DB row yet (never saved)
  // still get a row — the edit page falls back to fixture values and the
  // first save upserts the DB row.
  const blocks: ContentBlockListRow[] = CONTENT_BLOCK_KEYS.map((key) => ({
    key,
    updatedAt: dbRowsByKey.get(key)?.updatedAt ?? null,
  }));

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Content</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edit hero copy, callouts, the about body, and other keyed content
          blocks that appear across the public site. Each block is a structured
          JSON document — clicking{' '}
          <span className="font-medium text-foreground">Edit</span> opens a
          typed form.
        </p>
      </header>

      <ContentBlocksTable blocks={blocks} />
    </div>
  );
}
