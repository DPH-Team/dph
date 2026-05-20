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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import type { ActionState } from '@/components/admin/ResourceForm';

interface DeleteOverrideButtonProps {
  overrideDate: string;
  deleteAction: () => Promise<ActionState>;
}

/**
 * DeleteOverrideButton — opens a confirm dialog before calling the bound
 * deleteHoursOverrideAction. Surfaces server errors via sonner toast.
 */
export function DeleteOverrideButton({
  overrideDate,
  deleteAction,
}: DeleteOverrideButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAction();
      if (result && !result.ok) {
        toast.error(result.error ?? 'Failed to delete override.');
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
        Delete override
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete override for {overrideDate}?</DialogTitle>
          <DialogDescription>
            This will permanently remove the override for this date. The weekly
            schedule will apply instead. This action cannot be undone.
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
            {isPending ? 'Deleting…' : 'Yes, delete override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
