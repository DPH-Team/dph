'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResourceTable } from '@/components/admin/ResourceTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatEventRange } from '@/lib/datetime';
import type { Event } from '@/lib/db/schema';

interface EventsClientPageProps {
  events: Event[];
}

function eventIsUpcoming(event: Event): boolean {
  const effectiveEnd = event.endsAt ?? event.startsAt;
  return new Date(effectiveEnd) >= new Date();
}

export function EventsClientPage({ events }: EventsClientPageProps) {
  const upcoming = useMemo(
    () => events.filter(eventIsUpcoming),
    [events],
  );
  const past = useMemo(
    () => events.filter((e) => !eventIsUpcoming(e)),
    [events],
  );

  const columns = [
    {
      key: 'title',
      header: 'Title',
      cell: (r: Event) => (
        <span className="flex items-center gap-2 font-medium text-foreground">
          {r.title}
          {r.featured && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              Featured
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'when',
      header: 'When',
      cell: (r: Event) =>
        formatEventRange(
          new Date(r.startsAt),
          r.endsAt ? new Date(r.endsAt) : null,
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r: Event) =>
        r.published ? (
          <Badge variant="default" className="text-[10px]">
            Published
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            Draft
          </Badge>
        ),
      width: 'w-24',
    },
  ];

  const emptyUpcoming = {
    title: 'No upcoming events.',
    description:
      'Create your first event to see it on the public site.',
    action: (
      <Link href="/admin/events/new">
        <Button size="sm">New event</Button>
      </Link>
    ),
  };

  const emptyPast = {
    title: 'No past events.',
    description: 'Events that have ended will appear here.',
  };

  return (
    <Tabs defaultValue="upcoming">
      <TabsList>
        <TabsTrigger value="upcoming">
          Upcoming
          {upcoming.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({upcoming.length})
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="past">
          Past
          {past.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({past.length})
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upcoming">
        <ResourceTable
          data={upcoming}
          columns={columns}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/events/${r.id}`}
          emptyState={emptyUpcoming}
        />
      </TabsContent>

      <TabsContent value="past">
        <ResourceTable
          data={past}
          columns={columns}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/events/${r.id}`}
          emptyState={emptyPast}
        />
      </TabsContent>
    </Tabs>
  );
}
