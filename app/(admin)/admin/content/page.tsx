import { requireStaff } from '@/lib/auth';
import { listContentBlocks } from '@/lib/db/queries/content-blocks';
import { ContentBlocksTable } from './ContentBlocksTable';

export default async function ContentPage() {
  await requireStaff();

  const blocks = await listContentBlocks();

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
