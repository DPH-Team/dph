'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SortableItem {
  id: string;
  node: React.ReactNode;
}

export interface SortableListProps {
  items: SortableItem[];
  onReorder: (orderedIds: string[]) => void;
  layout?: 'list' | 'grid';
}

// ─── Single draggable row / tile ──────────────────────────────────────────────

function SortableRow({
  id,
  node,
  layout,
}: {
  id: string;
  node: React.ReactNode;
  layout: 'list' | 'grid';
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (layout === 'grid') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={cn(
          'relative rounded-lg border border-border bg-card overflow-hidden',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isDragging && 'opacity-50 ring-2 ring-primary',
        )}
      >
        {/* Drag handle sits in the top-left corner over the tile */}
        <button
          {...listeners}
          type="button"
          aria-label="Drag to reorder"
          className={cn(
            'absolute top-1.5 left-1.5 z-10 flex items-center justify-center',
            'size-6 rounded bg-black/60 text-white/80 cursor-grab',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'hover:bg-black/80 active:cursor-grabbing',
          )}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        {node}
      </div>
    );
  }

  // list layout
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-50 ring-2 ring-primary',
      )}
    >
      <button
        {...listeners}
        type="button"
        aria-label="Drag to reorder"
        className={cn(
          'flex shrink-0 cursor-grab items-center text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
          'hover:text-foreground active:cursor-grabbing',
        )}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">{node}</div>
    </div>
  );
}

// ─── SortableList ─────────────────────────────────────────────────────────────

export function SortableList({
  items,
  onReorder,
  layout = 'list',
}: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered.map((item) => item.id));
  }

  const strategy =
    layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={strategy}>
        <div
          className={cn(
            layout === 'grid'
              ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'
              : 'flex flex-col gap-2',
          )}
        >
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              node={item.node}
              layout={layout}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
