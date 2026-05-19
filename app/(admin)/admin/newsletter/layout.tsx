import { requireAdmin } from '@/lib/auth';

export default async function NewsletterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // notFound() for non-admin roles — keeps the route opaque to staff.
  await requireAdmin();

  return <>{children}</>;
}
