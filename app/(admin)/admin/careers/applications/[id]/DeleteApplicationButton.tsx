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

interface DeleteApplicationButtonProps {
  applicantName: string;
  deleteAction: () => Promise<ActionState>;
}

/**
 * DeleteApplicationButton — confirm dialog before calling the bound
 * deleteApplicationAction. Resume file is also deleted server-side.
 * On success the server action redirects.
 */
export function DeleteApplicationButton({
  applicantName,
  deleteAction,
}: DeleteApplicationButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAction();
      if (result && !result.ok) {
        toast.error(result.error ?? 'Failed to delete application.');
      }
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
        Delete application
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete application from {applicantName}?</DialogTitle>
          <DialogDescription>
            This permanently removes the application, all internal notes, and
            any attached resume from storage. The applicant will not be
            notified. This action cannot be undone.
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
            {isPending ? 'Deleting…' : 'Yes, delete application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
