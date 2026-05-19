import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function MenuPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Menu</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage food sections, items, pricing, and availability.
        </p>
      </div>
      <ComingSoonCard section="Menu" />
    </div>
  );
}
