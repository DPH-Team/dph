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

interface DeleteSectionButtonProps {
  sectionName: string;
  deleteAction: () => Promise<ActionState>;
}

/**
 * DeleteSectionButton — opens a confirm dialog before calling the bound
 * deleteMenuSectionAction. Surfaces server errors via sonner toast.
 */
export function DeleteSectionButton({
  sectionName,
  deleteAction,
}: DeleteSectionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteAction();
      if (result && !result.ok) {
        toast.error(result.error ?? 'Failed to delete section.');
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
        Delete section
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{sectionName}&rdquo;?</DialogTitle>
          <DialogDescription>
            This will permanently delete the section. You must delete or move
            all items inside it first. This action cannot be undone.
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
            {isPending ? 'Deleting…' : 'Yes, delete section'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
