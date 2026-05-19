import { Construction } from 'lucide-react';

interface ComingSoonCardProps {
  section: string;
  phase?: number;
}

export function ComingSoonCard({ section, phase = 4 }: ComingSoonCardProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
        <Construction
          className="size-6 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        {section} is on its way
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        This section lands in Phase {phase}. Check back once the build
        advances — the owner can manage {section.toLowerCase()} here when
        it&apos;s ready.
      </p>
    </div>
  );
}
