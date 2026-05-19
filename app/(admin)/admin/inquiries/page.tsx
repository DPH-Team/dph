import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function InquiriesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Inquiries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review reservation requests and contact form submissions. Confirm,
          decline, or add internal notes.
        </p>
      </div>
      <ComingSoonCard section="Inquiries inbox" />
    </div>
  );
}
