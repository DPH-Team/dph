'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ActionState } from '@/components/admin/ResourceForm';

interface DeleteItemButtonProps {
  itemName: string;
  deleteAction: () => Promise<ActionState>;
}

/**
 * DeleteItemButton — opens a confirm dialog before calling the bound
 * deleteMenuItemAction. Surfaces server errors via sonner toast.
 */
export function DeleteItemButton({
  itemName,
  deleteAction,
}: DeleteItemButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAction();
      if (result && !result.ok) {
        toast.error(result.error ?? 'Failed to delete item.');
      }
      // On success the server action redirects; no client-side navigation needed.
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" className="gap-2" />
        }
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete item
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{itemName}&rdquo;?</DialogTitle>
          <DialogDescription>
            This will permanently delete this menu item. This action cannot be
            undone.
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
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? 'Deleting…' : 'Yes, delete item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
