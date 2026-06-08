'use client';

import React, { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Pencil, Save, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { reorderMenuSectionsAction } from './actions';
import type { MenuSection } from '@/lib/db/schema';
import type { SortableListProps } from '@/components/admin/SortableList';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SectionWithCount = MenuSection & { itemCount: number };

// ─── Dynamic import (SSR disabled — dnd-kit is client-only) ──────────────────

const SortableList = dynamic<SortableListProps>(
  () => import('@/components/admin/SortableList').then((m) => m.SortableList),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading sortable list">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 animate-pulse">
            <GripVertical className="size-4 text-muted-foreground/30 shrink-0" aria-hidden="true" />
            <div className="h-4 flex-1 rounded bg-muted" />
          </div>
        ))}
      </div>
    ),
  },
);

// ─── Single row ───────────────────────────────────────────────────────────────

interface SectionRowProps {
  section: SectionWithCount;
}

function SectionRow({ section }: SectionRowProps) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Name + slug */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{section.name}</p>
        <p className="text-xs text-muted-foreground truncate">{section.slug}</p>
      </div>

      {/* Item count */}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {section.itemCount} {section.itemCount === 1 ? 'item' : 'items'}
      </span>

      {/* Status badges */}
      <div className="flex items-center gap-1 shrink-0">
        {section.available ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-transparent text-xs">
            Available
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground text-xs">
            Hidden
          </Badge>
        )}
        {section.showPrices ? (
          <Badge className="bg-sky-500/10 text-sky-400 border-transparent text-xs">
            Prices on
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground text-xs">
            Prices off
          </Badge>
        )}
        {section.showOnHomepage && (
          <Badge className="bg-amber-500/10 text-amber-400 border-transparent text-xs">
            Homepage
          </Badge>
        )}
      </div>

      {/* Edit link */}
      <Link
        href={`/admin/menu/sections/${section.id}`}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shrink-0',
          'hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label={`Edit ${section.name}`}
      >
        <Pencil className="size-3" aria-hidden="true" />
        Edit
      </Link>
    </div>
  );
}

// ─── SectionsTable ────────────────────────────────────────────────────────────

interface SectionsTableProps {
  sections: SectionWithCount[];
}

export function SectionsTable({ sections }: SectionsTableProps) {
  const [items, setItems] = useState<SectionWithCount[]>(sections);
  const [orderedIds, setOrderedIds] = useState<string[]>(
    sections.map((s) => s.id),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isPendingSave, startSaveTx] = useTransition();

  // ── Reorder ───────────────────────────────────────────────────────────────

  const handleReorder = (newIds: string[]) => {
    setOrderedIds(newIds);
    const idxMap = new Map(newIds.map((id, i) => [id, i]));
    setItems((prev) =>
      [...prev].sort((a, b) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0)),
    );
    setIsDirty(true);
  };

  const handleSaveOrder = () => {
    startSaveTx(async () => {
      const result = await reorderMenuSectionsAction(orderedIds);
      if (result.ok) {
        toast.success('Order saved.');
        setIsDirty(false);
      } else {
        toast.error(result.error ?? 'Failed to save order.');
      }
    });
  };

  // ── Sortable items ────────────────────────────────────────────────────────

  const sortableItems = items.map((section) => ({
    id: section.id,
    node: <SectionRow section={section} />,
  }));

  // ── Empty state ───────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
        <h3 className="text-base font-semibold text-foreground mb-1">
          No sections yet.
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1 mb-4">
          Create your first menu section to get started.
        </p>
        <Link
          href="/admin/menu/sections/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New section
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Save order banner */}
      {isDirty && (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 mb-4">
          <p className="text-sm text-foreground">
            Order changed — save to persist.
          </p>
          <Button
            size="sm"
            onClick={handleSaveOrder}
            disabled={isPendingSave}
            className="gap-1.5"
          >
            {isPendingSave ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            ) : (
              <Save className="size-3.5" aria-hidden="true" />
            )}
            Save order
          </Button>
        </div>
      )}

      <SortableList
        items={sortableItems}
        onReorder={handleReorder}
        layout="list"
      />
    </>
  );
}
