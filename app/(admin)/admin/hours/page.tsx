import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function HoursPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Hours</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set weekly hours and add date-specific overrides — closures,
          early closes, holiday hours.
        </p>
      </div>
      <ComingSoonCard section="Hours" />
    </div>
  );
}
