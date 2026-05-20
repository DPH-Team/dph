'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { SortableList } from '@/components/admin/SortableList';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  deleteTeamMemberAction,
  reorderTeamMembersAction,
} from './actions';
import type { TeamMember } from '@/lib/db/schema';

// ─── Public URL helper ────────────────────────────────────────────────────────

function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/media/${path}`;
}

// ─── Initials fallback ────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Delete dialog state ──────────────────────────────────────────────────────

interface DeleteDialogState {
  open: boolean;
  id: string;
  name: string;
}

// ─── Single row ───────────────────────────────────────────────────────────────

interface RowProps {
  member: TeamMember;
  onDeleteRequest: (id: string, name: string) => void;
}

function TeamRow({ member, onDeleteRequest }: RowProps) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {/* Avatar */}
      <div className="shrink-0 size-9 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
        {member.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicUrl(member.imagePath)}
            alt={member.name}
            className="object-cover w-full h-full"
            loading="lazy"
          />
        ) : (
          <span className="text-xs font-semibold text-primary" aria-hidden="true">
            {initials(member.name)}
          </span>
        )}
      </div>

      {/* Name + role */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={`/admin/team/${member.id}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground',
            'hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={`Edit ${member.name}`}
        >
          <Pencil className="size-3" aria-hidden="true" />
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onDeleteRequest(member.id, member.name)}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-background px-2 py-1 text-xs font-medium text-destructive',
            'hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={`Delete ${member.name}`}
        >
          <Trash2 className="size-3" aria-hidden="true" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── TeamList ─────────────────────────────────────────────────────────────────

interface TeamListProps {
  initialMembers: TeamMember[];
}

export function TeamList({ initialMembers }: TeamListProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [orderedIds, setOrderedIds] = useState<string[]>(
    initialMembers.map((m) => m.id),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    id: '',
    name: '',
  });
  const [isPendingSave, startSaveTx] = useTransition();
  const [isPendingDelete, startDeleteTx] = useTransition();

  // ── Reorder ───────────────────────────────────────────────────────────────

  const handleReorder = (newIds: string[]) => {
    setOrderedIds(newIds);
    const idxMap = new Map(newIds.map((id, i) => [id, i]));
    setMembers((prev) =>
      [...prev].sort((a, b) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0)),
    );
    setIsDirty(true);
  };

  const handleSaveOrder = () => {
    startSaveTx(async () => {
      const result = await reorderTeamMembersAction(orderedIds);
      if (result.ok) {
        toast.success('Order saved.');
        setIsDirty(false);
      } else {
        toast.error(result.error ?? 'Failed to save order.');
      }
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteDialog({ open: true, id, name });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, id: '', name: '' });
  };

  const confirmDelete = () => {
    const { id } = deleteDialog;
    closeDeleteDialog();

    startDeleteTx(async () => {
      const result = await deleteTeamMemberAction(id);
      if (result.ok) {
        toast.success('Team member deleted.');
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setOrderedIds((prev) => prev.filter((oid) => oid !== id));
      } else {
        toast.error(result.error ?? 'Failed to delete team member.');
      }
    });
  };

  // ── Sortable items ────────────────────────────────────────────────────────

  const sortableItems = members.map((member) => ({
    id: member.id,
    node: (
      <TeamRow
        member={member}
        onDeleteRequest={openDeleteDialog}
      />
    ),
  }));

  // ── Empty state ───────────────────────────────────────────────────────────

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
        <h3 className="text-base font-semibold text-foreground mb-1">
          No team members yet.
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1 mb-4">
          Add your first team member to show them on the About page.
        </p>
        <Link
          href="/admin/team/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Add team member
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

      {/* Delete confirm dialog */}
      {deleteDialog.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-team-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeDeleteDialog}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2
              id="delete-team-dialog-title"
              className="text-base font-semibold text-foreground mb-2"
            >
              Delete team member?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete{' '}
              <span className="font-medium text-foreground">
                {deleteDialog.name}
              </span>{' '}
              and remove their photo from storage. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={closeDeleteDialog}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmDelete}
                disabled={isPendingDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
