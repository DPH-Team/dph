'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, ShieldCheck, UserRound } from 'lucide-react';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { ResourceTable, type Column } from '@/components/admin/ResourceTable';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updateUserRoleAction, setUserStatusAction } from './actions';
import type { UserViewModel } from '@/lib/db/queries/users';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function relativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAbsolute(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'active' | 'disabled' }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
      Disabled
    </span>
  );
}

// ─── Confirm dialog for status change ────────────────────────────────────────

interface StatusConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserViewModel;
  action: 'disable' | 'enable';
  onConfirm: () => void;
  isPending: boolean;
}

function StatusConfirmDialog({
  open,
  onOpenChange,
  user,
  action,
  onConfirm,
  isPending,
}: StatusConfirmDialogProps) {
  const isDisabling = action === 'disable';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isDisabling
              ? `Disable access for ${user.email}?`
              : `Re-enable access for ${user.email}?`}
          </DialogTitle>
          <DialogDescription>
            {isDisabling
              ? 'They will be signed out immediately and unable to log in until reactivated. No data will be deleted.'
              : 'They will be able to log in again with their existing credentials.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
            disabled={isPending}
          >
            Cancel
          </DialogClose>
          <Button
            variant={isDisabling ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending
              ? isDisabling
                ? 'Disabling…'
                : 'Enabling…'
              : isDisabling
                ? 'Yes, disable access'
                : 'Yes, re-enable access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm dialog for role change ──────────────────────────────────────────

interface RoleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserViewModel;
  newRole: 'admin' | 'staff';
  onConfirm: () => void;
  isPending: boolean;
}

function RoleConfirmDialog({
  open,
  onOpenChange,
  user,
  newRole,
  onConfirm,
  isPending,
}: RoleConfirmDialogProps) {
  const isPromotion = newRole === 'admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {isPromotion
              ? `Promote ${user.email} to admin?`
              : `Change ${user.email} to staff?`}
          </DialogTitle>
          <DialogDescription>
            {isPromotion
              ? 'Admins have full access to all settings including integrations, newsletter, and user management.'
              : 'Staff can edit content (events, menu, hours, gallery, inquiries, careers) but cannot access integrations, newsletter, or user management.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
            disabled={isPending}
          >
            Cancel
          </DialogClose>
          <Button
            variant={isPromotion ? 'default' : 'secondary'}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending
              ? 'Saving…'
              : isPromotion
                ? 'Yes, make admin'
                : 'Yes, change to staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

interface RowActionsProps {
  user: UserViewModel;
  currentUserId: string;
}

function RowActions({ user, currentUserId }: RowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [statusDialog, setStatusDialog] = useState<'disable' | 'enable' | null>(null);
  const [roleDialog, setRoleDialog] = useState<'admin' | 'staff' | null>(null);

  const isSelf = user.id === currentUserId;

  function handleStatusConfirm() {
    if (!statusDialog) return;
    const actionArg = statusDialog;
    startTransition(async () => {
      const result = await setUserStatusAction(user.id, actionArg);
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to update user status.');
      } else {
        toast.success(
          actionArg === 'disable'
            ? `${user.email} has been disabled.`
            : `${user.email} has been re-enabled.`,
        );
      }
      setStatusDialog(null);
    });
  }

  function handleRoleConfirm() {
    if (!roleDialog) return;
    const newRole = roleDialog;
    startTransition(async () => {
      const result = await updateUserRoleAction(user.id, newRole);
      if (!result.ok) {
        toast.error(result.error ?? 'Failed to update role.');
      } else {
        toast.success(`Role updated to ${newRole}.`);
      }
      setRoleDialog(null);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${user.email}`}
              disabled={isPending}
            />
          }
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {user.fullName ?? user.email}
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          {/* Role change — only show the opposite role option */}
          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              {user.role === 'staff' ? (
                <DropdownMenuItem onSelect={() => setRoleDialog('admin')}>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Set as admin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setRoleDialog('staff')}>
                  <UserRound className="size-4" aria-hidden="true" />
                  Set as staff
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Status toggle */}
          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              {user.status === 'active' ? (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setStatusDialog('disable')}
                >
                  Disable access
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setStatusDialog('enable')}>
                  Re-enable access
                </DropdownMenuItem>
              )}
            </>
          )}

          {isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground text-xs">
                  You cannot modify your own account here.
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status confirm dialogs — always rendered so close animation plays */}
      <StatusConfirmDialog
        open={statusDialog === 'disable'}
        onOpenChange={(open) => !open && setStatusDialog(null)}
        user={user}
        action="disable"
        onConfirm={handleStatusConfirm}
        isPending={isPending}
      />
      <StatusConfirmDialog
        open={statusDialog === 'enable'}
        onOpenChange={(open) => !open && setStatusDialog(null)}
        user={user}
        action="enable"
        onConfirm={handleStatusConfirm}
        isPending={isPending}
      />

      {/* Role confirm dialogs — always rendered so close animation plays */}
      <RoleConfirmDialog
        open={roleDialog === 'admin'}
        onOpenChange={(open) => !open && setRoleDialog(null)}
        user={user}
        newRole="admin"
        onConfirm={handleRoleConfirm}
        isPending={isPending}
      />
      <RoleConfirmDialog
        open={roleDialog === 'staff'}
        onOpenChange={(open) => !open && setRoleDialog(null)}
        user={user}
        newRole="staff"
        onConfirm={handleRoleConfirm}
        isPending={isPending}
      />
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UsersTableProps {
  users: UserViewModel[];
  hasFilters: boolean;
  currentUserId: string;
}

export function UsersTable({ users, hasFilters, currentUserId }: UsersTableProps) {
  const columns: Column<UserViewModel>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (u) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">
            {u.fullName ?? <span className="text-muted-foreground italic">No name</span>}
            {u.isSelf && (
              <span className="ml-2 inline-flex items-center rounded-full border border-border bg-[oklch(0.235_0.004_286)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                You
              </span>
            )}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {u.email}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: 'w-24',
      cell: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: 'lastSignIn',
      header: 'Last sign-in',
      width: 'w-36',
      cell: (u) => (
        <span
          title={formatAbsolute(u.lastSignInAt)}
          className="tabular-nums text-muted-foreground text-xs"
        >
          {relativeTime(u.lastSignInAt)}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      width: 'w-28',
      cell: (u) => (
        <span
          title={formatAbsolute(u.createdAt)}
          className="tabular-nums text-muted-foreground text-xs"
        >
          {relativeTime(u.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <ResourceTable
      data={users}
      columns={columns}
      rowKey={(u) => u.id}
      emptyState={{
        title: hasFilters ? 'No users match the current filters.' : 'No users yet.',
        description: hasFilters
          ? undefined
          : 'Create the first user to get started.',
        action: hasFilters ? (
          <Link
            href="/admin/users"
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </Link>
        ) : (
          <Link
            href="/admin/users/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[oklch(0.610_0.128_46)]"
          >
            New user
          </Link>
        ),
      }}
      rowActions={(u) => <RowActions user={u} currentUserId={currentUserId} />}
    />
  );
}
