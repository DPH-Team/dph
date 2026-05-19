import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function NewsletterPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Newsletter</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View your subscriber list and export to CSV for broadcast sends
          via Resend.
        </p>
      </div>
      <ComingSoonCard section="Newsletter" />
    </div>
  );
}
