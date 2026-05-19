import { requireStaff } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login if no session; returns profile on success.
  const profile = await requireStaff();

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
