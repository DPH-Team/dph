import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getApplicationById } from '@/lib/db/queries/career-applications';
import { getPostingById } from '@/lib/db/queries/career-postings';
import {
  updateApplicationStatusAction,
  updateApplicationNotesAction,
  deleteApplicationAction,
} from '@/app/(admin)/admin/careers/applications/actions';
import { Card, CardContent } from '@/components/ui/card';
import { ApplicationStatusPanel } from './ApplicationStatusPanel';
import { ApplicationNotesPanel } from './ApplicationNotesPanel';
import { DeleteApplicationButton } from './DeleteApplicationButton';
import { ResumeDownloadButton } from './ResumeDownloadButton';
import type { ApplicationStatus } from '@/lib/validators/careers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAbsolute(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-2.5 border-b border-border/60 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  await requireStaff();

  const { id } = await params;

  const application = await getApplicationById(id);
  if (!application) {
    notFound();
  }

  // Optionally load the linked posting for its title
  const posting = application.postingId
    ? await getPostingById(application.postingId)
    : null;

  const submittedAt = new Date(application.createdAt);

  // Bind actions
  const boundStatusAction = updateApplicationStatusAction.bind(null, id);
  const boundNotesAction = updateApplicationNotesAction.bind(null, id);
  const boundDeleteAction = deleteApplicationAction.bind(null, id);

  return (
    <div className="space-y-6 max-w-5xl">
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
          <Link
            href="/admin/careers/applications"
            className="hover:text-foreground transition-colors"
          >
            Applications
          </Link>
          {' › '}
          <span>{application.name}</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Application from {application.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Submitted{' '}
          <time
            dateTime={submittedAt.toISOString()}
            title={formatAbsolute(submittedAt)}
          >
            {relativeTime(submittedAt)}
          </time>
          {posting && (
            <>
              {' '}
              &middot; for{' '}
              <Link
                href={`/admin/careers/postings/${posting.id}`}
                className="text-primary hover:underline"
              >
                {posting.title}
              </Link>
            </>
          )}
          {application.postingId && !posting && (
            <> &middot; <span className="italic">Posting deleted</span></>
          )}
        </p>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        {/* Left — submission details */}
        <section aria-labelledby="submission-heading">
          <h2 id="submission-heading" className="sr-only">
            Application details
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <dl>
              <DetailRow label="Name">{application.name}</DetailRow>
              <DetailRow label="Email">
                <a
                  href={`mailto:${application.email}`}
                  className="text-primary hover:underline break-all"
                >
                  {application.email}
                </a>
              </DetailRow>
              {application.phone && (
                <DetailRow label="Phone">
                  <a href={`tel:${application.phone}`} className="hover:underline">
                    {application.phone}
                  </a>
                </DetailRow>
              )}
              <DetailRow label="Posting">
                {posting ? (
                  <Link
                    href={`/admin/careers/postings/${posting.id}`}
                    className="text-primary hover:underline"
                  >
                    {posting.title}
                  </Link>
                ) : application.postingId ? (
                  <span className="text-muted-foreground italic">
                    Posting deleted
                  </span>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </DetailRow>
              <DetailRow label="Message">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {application.message}
                </p>
              </DetailRow>
              <DetailRow label="Resume">
                {application.resumePath ? (
                  <ResumeDownloadButton applicationId={id} />
                ) : (
                  <span className="text-muted-foreground italic">
                    No resume attached
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Submitted">
                <time dateTime={submittedAt.toISOString()}>
                  {formatAbsolute(submittedAt)}
                </time>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({relativeTime(submittedAt)})
                </span>
              </DetailRow>
            </dl>
          </div>
        </section>

        {/* Right — sidebar panels */}
        <aside className="space-y-4">
          {/* Status panel */}
          <ApplicationStatusPanel
            id={id}
            currentStatus={application.status as ApplicationStatus}
            handledAt={
              application.handledAt ? new Date(application.handledAt) : null
            }
            updateAction={boundStatusAction}
          />

          {/* Notes panel */}
          <ApplicationNotesPanel
            id={id}
            initialNotes={application.internalNotes ?? null}
            updateAction={boundNotesAction}
          />

          {/* Danger zone */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Delete this application
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently removes the application, all notes, and any
                  attached resume. The applicant is not notified. This action
                  cannot be undone.
                </p>
              </div>
              <div>
                <DeleteApplicationButton
                  applicantName={application.name}
                  deleteAction={boundDeleteAction}
                />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
