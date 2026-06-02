import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login if no session; returns profile on success.
  const profile = await requireStaff();

  return (
    <AdminShell profile={profile}>
      {children}
      <Toaster position="bottom-right" richColors />
    </AdminShell>
  );
}
