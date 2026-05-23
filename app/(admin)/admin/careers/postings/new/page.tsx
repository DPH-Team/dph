import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createPostingAction } from '@/app/(admin)/admin/careers/postings/actions';
import { PostingForm } from '@/app/(admin)/admin/careers/postings/PostingForm';

export default async function NewPostingPage() {
  await requireStaff();

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
          <span>New posting</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">New posting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create a job posting to display on the public careers page.
        </p>
      </header>

      <PostingForm mode="create" action={createPostingAction} />
    </div>
  );
}
