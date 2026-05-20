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
import type { ActionState } from '@/lib/types/action-state';

interface DeleteInquiryButtonProps {
  guestName: string;
  deleteAction: () => Promise<ActionState>;
}

/**
 * DeleteInquiryButton — confirm dialog before calling the bound
 * deleteInquiryAction. Surfaces server errors via sonner toast.
 * On success, the server action redirects — no client-side navigation needed.
 */
export function DeleteInquiryButton({
  guestName,
  deleteAction,
}: DeleteInquiryButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAction();
      if (result && !result.ok) {
        toast.error(result.error ?? 'Failed to delete inquiry.');
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
        Delete inquiry
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete inquiry from {guestName}?</DialogTitle>
          <DialogDescription>
            This permanently removes the inquiry and all its notes. There is no
            way to undo this — the guest will not be notified.
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
            {isPending ? 'Deleting…' : 'Yes, delete inquiry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
