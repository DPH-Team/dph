import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireStaff, getSessionUser } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** The password-change page is the only route reachable with must_change_password = true. */
const PASSWORD_CHANGE_PATH = '/admin/account/password';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login if no session; returns profile on success.
  const profile = await requireStaff();

  // Forced password change: if the session user has must_change_password = true
  // in their app_metadata, redirect to the password-change page — unless they
  // are already on it (avoid infinite redirect).
  const sessionUser = await getSessionUser();
  if (sessionUser?.app_metadata?.must_change_password === true) {
    // Resolve the current path via the x-pathname header set by middleware.
    let currentPath = '/admin';
    try {
      const h = await headers();
      currentPath = h.get('x-pathname') ?? '/admin';
    } catch {
      // Outside a request context — skip the check.
    }

    if (!currentPath.startsWith(PASSWORD_CHANGE_PATH)) {
      redirect(PASSWORD_CHANGE_PATH);
    }
  }

  return (
    <AdminShell profile={profile}>
      {children}
      <Toaster position="bottom-right" richColors />
    </AdminShell>
  );
}
