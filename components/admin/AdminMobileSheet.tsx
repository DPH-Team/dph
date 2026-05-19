'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AdminSidebar } from './AdminSidebar';
import type { AppRole } from '@/lib/auth';

interface AdminMobileSheetProps {
  role: AppRole;
}

export function AdminMobileSheet({ role }: AdminMobileSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open navigation menu"
            aria-expanded={open}
          />
        }
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
        <SheetHeader className="sr-only">
          <SheetTitle>Admin navigation</SheetTitle>
        </SheetHeader>
        <AdminSidebar role={role} onNavClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
