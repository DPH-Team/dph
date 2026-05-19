import { requireStaff } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default async function EventsPage() {
  await requireStaff();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sourced from Untappd for Business. The website mirrors what you publish
          there.
        </p>
      </header>

      <Card className="border-border bg-card">
        <CardContent className="px-8 py-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-accent" />
            <h2 className="text-lg font-semibold text-foreground">
              Events live in Untappd
            </h2>
          </div>

          <p className="text-sm text-muted-foreground max-w-prose leading-relaxed">
            Your events are managed straight from your Untappd for Business
            dashboard&nbsp;&mdash; they&apos;ll show up on the site within a
            few minutes of you saving them. We just listen.
          </p>

          <Button
            size="sm"
            className="gap-2"
            nativeButton={false}
            render={
              <a
                href="https://business.untappd.com"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Open Untappd Business
            <ExternalLink className="size-4" aria-hidden="true" />
          </Button>

          <p className="text-xs text-muted-foreground pt-2">
            Sync runs in the background every few minutes. Nothing to do here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
