'use client';

import Link from 'next/link';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/format';
import type { MenuItem } from '@/lib/db/schema';
import type { Allergen } from '@/lib/validators/menu';

// ─── Allergen helpers ──────────────────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────────────────────────

interface ItemsTableProps {
  items: MenuItem[];
  sectionId: string;
}

export function ItemsTable({ items, sectionId }: ItemsTableProps) {
  const newItemHref = `/admin/menu/sections/${sectionId}/items/new`;

  const columns: Column<MenuItem>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (item) => (
        <div>
          <span className="font-medium text-foreground">{item.name}</span>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
              {item.description.length > 80
                ? item.description.slice(0, 80) + '…'
                : item.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      width: 'w-24',
      cell: (item) => (
        <span className="font-mono text-sm">{formatCents(item.priceCents)}</span>
      ),
    },
    {
      key: 'allergens',
      header: 'Allergens',
      cell: (item) => (
        <AllergensCell allergens={item.allergens as string[]} />
      ),
    },
    {
      key: 'sortOrder',
      header: 'Sort',
      align: 'right',
      width: 'w-20',
      cell: (item) => (
        <span className="text-muted-foreground">{item.sortOrder}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (item) =>
        item.available ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-transparent">
            Available
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground">
            Hidden
          </Badge>
        ),
    },
  ];

  return (
    <ResourceTable
      data={items}
      columns={columns}
      rowKey={(i) => i.id}
      rowHref={(i) => `/admin/menu/sections/${sectionId}/items/${i.id}`}
      emptyState={{
        title: 'No items in this section.',
        description: 'Add your first item to start building the menu.',
        action: (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={newItemHref} />}
          >
            + New item
          </Button>
        ),
      }}
    />
  );
}
