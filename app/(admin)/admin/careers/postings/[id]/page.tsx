import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getPostingById } from '@/lib/db/queries/career-postings';
import {
  updatePostingAction,
  deletePostingAction,
} from '@/app/(admin)/admin/careers/postings/actions';
import { PostingForm } from '@/app/(admin)/admin/careers/postings/PostingForm';
import { DeletePostingButton } from './DeletePostingButton';
import { Card, CardContent } from '@/components/ui/card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostingPage({ params }: PageProps) {
  await requireStaff();

  const { id } = await params;

  const posting = await getPostingById(id);
  if (!posting) {
    notFound();
  }

  // Bind actions with the posting id
  const boundUpdateAction = updatePostingAction.bind(null, id);
  const boundDeleteAction = deletePostingAction.bind(null, id);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link
            href="/admin/careers"
            className="hover:text-foreground transition-colors"
          >
            Careers
          </Link>
          {' › '}
          <span>{posting.title}</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          {posting.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {posting.department} &middot;{' '}
          {posting.type === 'full_time' ? 'Full-time' : 'Part-time'} &middot;{' '}
          {posting.isOpen ? 'Open' : 'Closed'}
        </p>
      </header>

      {/* Edit form */}
      <PostingForm
        mode="edit"
        posting={posting}
        action={boundUpdateAction}
      />

      {/* Danger zone */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Delete this posting
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently removes this posting from the public site. Existing
              applications are kept but will no longer be linked to it. This
              action cannot be undone.
            </p>
          </div>
          <div>
            <DeletePostingButton
              postingTitle={posting.title}
              deleteAction={boundDeleteAction}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
