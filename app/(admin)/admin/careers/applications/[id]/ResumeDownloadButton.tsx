'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getResumeDownloadUrlAction } from '@/app/(admin)/admin/careers/applications/actions';

interface ResumeDownloadButtonProps {
  applicationId: string;
}

/**
 * ResumeDownloadButton — requests a signed download URL server-side and opens
 * it in a new tab. The action also writes an audit log entry for the download.
 */
export function ResumeDownloadButton({
  applicationId,
}: ResumeDownloadButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleDownload() {
    startTransition(async () => {
      const result = await getResumeDownloadUrlAction(applicationId);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      // Open the signed URL in a new tab — the browser handles the download.
      window.open(result.url, '_blank', 'noopener,noreferrer');
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={isPending}
      onClick={handleDownload}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {isPending ? 'Preparing…' : 'Download resume'}
    </Button>
  );
}
