import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getInquiryById } from '@/lib/db/queries/inquiries';
import {
  updateInquiryStatusAction,
  updateInquiryNotesAction,
  deleteInquiryAction,
} from '@/app/(admin)/admin/inquiries/actions';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPanel } from './StatusPanel';
import { NotesPanel } from './NotesPanel';
import { DeleteInquiryButton } from './DeleteInquiryButton';
import type { InquiryStatus, InquiryType } from '@/lib/validators/inquiries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<InquiryType, string> = {
  reservation: 'Reservation',
  private_event: 'Private Event',
  press: 'Press',
  general: 'General',
};

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPreferredTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
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

export default async function InquiryDetailPage({ params }: PageProps) {
  await requireStaff();

  const { id } = await params;

  const inquiry = await getInquiryById(id);
  if (!inquiry) {
    notFound();
  }

  const receivedAt = new Date(inquiry.createdAt);

  // Bind actions with the inquiry id
  const boundStatusAction = updateInquiryStatusAction.bind(null, id);
  const boundNotesAction = updateInquiryNotesAction.bind(null, id);
  const boundDeleteAction = deleteInquiryAction.bind(null, id);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb + back link */}
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link
            href="/admin/inquiries"
            className="hover:text-foreground transition-colors"
          >
            Inquiries
          </Link>
          {' › '}
          <span>{inquiry.name}</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Inquiry from {inquiry.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {TYPE_LABELS[inquiry.type as InquiryType] ?? inquiry.type} &middot; received{' '}
          <time dateTime={receivedAt.toISOString()} title={formatAbsolute(receivedAt)}>
            {relativeTime(receivedAt)}
          </time>
        </p>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        {/* Left — submission details */}
        <section aria-labelledby="submission-heading">
          <h2 id="submission-heading" className="sr-only">
            Submission details
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <dl>
              <DetailRow label="Type">
                {TYPE_LABELS[inquiry.type as InquiryType] ?? inquiry.type}
              </DetailRow>
              <DetailRow label="Name">{inquiry.name}</DetailRow>
              <DetailRow label="Email">
                <a
                  href={`mailto:${inquiry.email}`}
                  className="text-primary hover:underline break-all"
                >
                  {inquiry.email}
                </a>
              </DetailRow>
              {inquiry.phone && (
                <DetailRow label="Phone">
                  <a href={`tel:${inquiry.phone}`} className="hover:underline">
                    {inquiry.phone}
                  </a>
                </DetailRow>
              )}
              {inquiry.partySize != null && (
                <DetailRow label="Party size">{inquiry.partySize}</DetailRow>
              )}
              {inquiry.preferredDate && (
                <DetailRow label="Preferred date">
                  {inquiry.preferredDate}
                  {inquiry.preferredTime && (
                    <> at {formatPreferredTime(inquiry.preferredTime)}</>
                  )}
                </DetailRow>
              )}
              <DetailRow label="Message">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {inquiry.message}
                </p>
              </DetailRow>
              <DetailRow label="Consent">
                <span
                  className={
                    inquiry.consent ? 'text-emerald-400' : 'text-destructive'
                  }
                >
                  {inquiry.consent ? 'Given' : 'Not given'}
                </span>
              </DetailRow>
              <DetailRow label="Received">
                <time dateTime={receivedAt.toISOString()}>
                  {formatAbsolute(receivedAt)}
                </time>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({relativeTime(receivedAt)})
                </span>
              </DetailRow>
            </dl>
          </div>
        </section>

        {/* Right — sidebar panels */}
        <aside className="space-y-4">
          {/* Status panel */}
          <StatusPanel
            id={id}
            currentStatus={inquiry.status as InquiryStatus}
            handledAt={inquiry.handledAt ? new Date(inquiry.handledAt) : null}
            updateAction={boundStatusAction}
          />

          {/* Notes panel */}
          <NotesPanel
            id={id}
            initialNotes={inquiry.internalNotes ?? null}
            updateAction={boundNotesAction}
          />

          {/* Danger zone */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Delete this inquiry
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently removes the inquiry and its notes. The guest is
                  not notified. This action cannot be undone.
                </p>
              </div>
              <div>
                <DeleteInquiryButton
                  guestName={inquiry.name}
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
