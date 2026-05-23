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

interface DeletePostingButtonProps {
  postingTitle: string;
  deleteAction: () => Promise<ActionState>;
}

/**
 * DeletePostingButton — confirm dialog before calling the bound
 * deletePostingAction. Surfaces server errors via sonner toast.
 * On success the server action redirects — no client navigation needed.
 */
export function DeletePostingButton({
  postingTitle,
  deleteAction,
}: DeletePostingButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAction();
      if (result && !result.ok) {
        toast.error(result.error ?? 'Failed to delete posting.');
      }
      // On success the server action redirects.
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
        Delete posting
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{postingTitle}&rdquo;?</DialogTitle>
          <DialogDescription>
            This permanently removes the posting. Any existing applications for
            this posting are retained but will no longer be linked to it. This
            action cannot be undone.
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
            {isPending ? 'Deleting…' : 'Yes, delete posting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
