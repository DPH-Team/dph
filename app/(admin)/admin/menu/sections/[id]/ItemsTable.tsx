'use client';

import React, { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Pencil, Save, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/format';
import { reorderMenuItemsAction } from '@/app/(admin)/admin/menu/actions';
import type { MenuItem } from '@/lib/db/schema';
import type { Allergen } from '@/lib/validators/menu';
import type { SortableListProps } from '@/components/admin/SortableList';

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

// ─── Allergen helpers ─────────────────────────────────────────────────────────

const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  dairy: 'Dairy',
  nuts: 'Nuts',
  shellfish: 'Shellfish',
  egg: 'Egg',
  soy: 'Soy',
};

const MAX_VISIBLE_ALLERGENS = 3;

function AllergensCell({ allergens }: { allergens: string[] }) {
  if (!allergens || allergens.length === 0) {
    return <span className="text-muted-foreground text-xs">None</span>;
  }

  const visible = allergens.slice(0, MAX_VISIBLE_ALLERGENS);
  const overflow = allergens.length - MAX_VISIBLE_ALLERGENS;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((a) => (
        <Badge
          key={a}
          className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground border-border"
          variant="secondary"
        >
          {ALLERGEN_LABELS[a as Allergen] ?? a}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge className="text-xs px-1.5 py-0.5" variant="secondary">
          +{overflow} more
        </Badge>
      )}
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: MenuItem;
  sectionId: string;
}

function ItemRow({ item, sectionId }: ItemRowProps) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Name + price */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {formatCents(item.priceCents)}
        </p>
      </div>

      {/* Allergens */}
      <div className="shrink-0 hidden sm:block">
        <AllergensCell allergens={item.allergens as string[]} />
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1 shrink-0">
        {item.available ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-transparent text-xs">
            Available
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground text-xs">
            Hidden
          </Badge>
        )}
        {!item.showPrice && (
          <Badge variant="secondary" className="text-muted-foreground text-xs">
            Price hidden
          </Badge>
        )}
      </div>

      {/* Edit link */}
      <Link
        href={`/admin/menu/sections/${sectionId}/items/${item.id}`}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shrink-0',
          'hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label={`Edit ${item.name}`}
      >
        <Pencil className="size-3" aria-hidden="true" />
        Edit
      </Link>
    </div>
  );
}

// ─── ItemsTable ───────────────────────────────────────────────────────────────

interface ItemsTableProps {
  items: MenuItem[];
  sectionId: string;
}

export function ItemsTable({ items, sectionId }: ItemsTableProps) {
  const [sortedItems, setSortedItems] = useState<MenuItem[]>(items);
  const [orderedIds, setOrderedIds] = useState<string[]>(
    items.map((i) => i.id),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isPendingSave, startSaveTx] = useTransition();

  const newItemHref = `/admin/menu/sections/${sectionId}/items/new`;

  // ── Reorder ───────────────────────────────────────────────────────────────

  const handleReorder = (newIds: string[]) => {
    setOrderedIds(newIds);
    const idxMap = new Map(newIds.map((id, i) => [id, i]));
    setSortedItems((prev) =>
      [...prev].sort((a, b) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0)),
    );
    setIsDirty(true);
  };

  const handleSaveOrder = () => {
    startSaveTx(async () => {
      const result = await reorderMenuItemsAction(sectionId, orderedIds);
      if (result.ok) {
        toast.success('Order saved.');
        setIsDirty(false);
      } else {
        toast.error(result.error ?? 'Failed to save order.');
      }
    });
  };

  // ── Sortable items ────────────────────────────────────────────────────────

  const sortableItems = sortedItems.map((item) => ({
    id: item.id,
    node: <ItemRow item={item} sectionId={sectionId} />,
  }));

  // ── Empty state ───────────────────────────────────────────────────────────

  if (sortedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
        <h3 className="text-base font-semibold text-foreground mb-1">
          No items in this section.
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1 mb-4">
          Add your first item to start building the menu.
        </p>
        <Link
          href={newItemHref}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New item
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
